import { fetch } from 'undici';
import pRetry from 'p-retry';
import { metadataConfig } from '../config.js';
import type { AdapterInput, AdapterResult, MetadataAdapter, LookupContext, AdapterLabel, ConfidenceLevel } from '../types.js';
import { buildCacheKey } from '../utils/cache.js';
import { RateLimiter } from '../utils/rate-limit.js';
import { resolveSlug, type SlugResolution } from '../utils/slug.js';

type LocRecord = {
  id?: string;
  url?: string;
  title?: string;
  subjects?: string[];
  subject_headings?: string[];
  genre_headings?: string[];
  lc_classifications?: string[];
};

type LocResponse = {
  results?: LocRecord[];
};

const confidenceScale: Record<SlugResolution['matchType'], ConfidenceLevel> = {
  id: 'high',
  label: 'high',
  generated: 'medium',
};

function inferKind(label: string): AdapterLabel['kind'] {
  const lower = label.toLowerCase();
  if (/\b(series|trilogy|saga)\b/.test(lower)) return 'topic';
  if (/\bfiction\b/.test(lower) || /\bstories\b/.test(lower) || /\bnovels?\b/.test(lower)) {
    return 'genre';
  }
  if (/\bpoetry\b/.test(lower)) return 'genre';
  if (/\bbiography\b/.test(lower) || /\bauthors?\b/.test(lower) || /\bpersons?\b/.test(lower)) {
    return 'person';
  }
  if (/\bplaces?\b/.test(lower) || /\bcountries?\b/.test(lower) || /\b(state|city|province)\b/.test(lower)) {
    return 'place';
  }
  if (/\bclimate\b/.test(lower) || /\bscience\b/.test(lower)) return 'topic';
  return 'topic';
}

function gatherSubjects(record: LocRecord): string[] {
  const bucket = new Set<string>();
  const pushAll = (values?: unknown) => {
    if (Array.isArray(values)) {
      values.forEach((value) => {
        if (typeof value === 'string') {
          const cleaned = value.trim();
          if (cleaned) bucket.add(cleaned);
        }
      });
    }
  };
  pushAll(record.subjects);
  pushAll(record.subject_headings);
  pushAll(record.genre_headings);
  const item: any = (record as any)?.item;
  if (item) {
    pushAll(item.subjects);
    pushAll(item.subject);
    pushAll(item.genre);
  }
  return Array.from(bucket);
}

const limiter = new RateLimiter(
  metadataConfig.sources.loc.rateLimitMs,
  metadataConfig.sources.loc.jitterMs,
);

async function fetchLoc(
  params: URLSearchParams,
  context: LookupContext,
  notes: string[],
  attemptLabel: string,
): Promise<LocResponse | null> {
  const { searchEndpoint, maxRetries } = metadataConfig.sources.loc;
  const requestParams = new URLSearchParams(params);
  if (!requestParams.has('fo')) requestParams.set('fo', 'json');
  if (!requestParams.has('c')) requestParams.set('c', '10');
  const url = `${searchEndpoint}?${requestParams.toString()}`;
  try {
    const response = await pRetry(
      async () => {
        await limiter.wait();
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': metadataConfig.sources.loc.userAgent,
          },
          signal: context.signal,
        });
        if (!res.ok) {
          throw new Error(`LoC responded with ${res.status}`);
        }
        return res;
      },
      {
        retries: maxRetries,
        factor: 1.5,
        onFailedAttempt(error) {
          const reason =
            (error as any)?.message ??
            (error as any)?.shortMessage ??
            `attempt ${error.attemptNumber} failed`;
          notes.push(`[loc] ${attemptLabel} attempt ${error.attemptNumber} failed: ${reason}`);
        },
      },
    );
    const data = (await response.json()) as LocResponse;
    return data;
  } catch (error: any) {
    notes.push(`[loc] ${attemptLabel} fetch failed: ${error.message ?? error}`);
    return null;
  }
}

export class LibraryOfCongressAdapter implements MetadataAdapter {
  readonly id = 'loc';

  async lookup(input: AdapterInput, context: LookupContext): Promise<AdapterResult> {
    const notes: string[] = [];
    const cacheKey = buildCacheKey({
      isbn13: input.isbn13 ?? input.isbn10 ?? null,
      isbn10: input.isbn10 ?? null,
      doi: input.doi ?? null,
      oclc: input.oclc ?? null,
      title: input.title ?? null,
      authors: input.authors ?? [],
    });
    const cached = await context.cache.read<LocResponse>(this.id, cacheKey);
    let payload: LocResponse | null = null;
    if (cached?.data?.results?.length) {
      payload = cached.data;
      notes.push('[loc] cache hit');
    } else {
      const attempts: Array<{ params: URLSearchParams; label: string }> = [];
      const isbnLookup = input.isbn13 ?? input.isbn10;
      if (isbnLookup) {
        attempts.push({
          params: new URLSearchParams({
            q: isbnLookup,
            all: 'true',
          }),
          label: 'isbn lookup',
        });
      }

      if (input.title) {
        const sanitizedTitle = input.title.replace(/[^A-Za-z0-9\s]/g, ' ').trim();
        if (sanitizedTitle) {
          let titleQuery = sanitizedTitle;
          if (input.authors?.length) {
            titleQuery += ` ${input.authors.slice(0, 2).join(' ')}`;
          }
          attempts.push({
            params: new URLSearchParams({
              q: titleQuery,
              all: 'true',
            }),
            label: isbnLookup ? 'title fallback' : 'title lookup',
          });
        }
      }

      if (!attempts.length) {
        notes.push('[loc] skipped – no identifier available');
        return { labels: [], notes };
      }

      for (const attempt of attempts) {
        const response = await fetchLoc(attempt.params, context, notes, attempt.label);
        if (response?.results?.length) {
          payload = response;
          if (attempt.label === 'title fallback') {
            notes.push('[loc] using title fallback results');
          }
          break;
        }
        if (response && (!response.results || response.results.length === 0)) {
          notes.push(`[loc] ${attempt.label} returned no matches`);
        }
      }

      if (payload) {
        await context.cache.write(this.id, cacheKey, {
          fetchedAt: new Date().toISOString(),
          data: payload,
        });
      }
    }

    if (!payload?.results?.length) {
      notes.push('[loc] no matches returned');
      return { labels: [], notes };
    }

    const labelMap = new Map<string, AdapterLabel>();
    const lookupNotes: string[] = [];

    for (const record of payload.results.slice(0, 5)) {
      const recordUrl = record.id ?? record.url;
      const subjects = gatherSubjects(record);
      for (const subject of subjects) {
        const resolution = resolveSlug(this.id, subject, undefined, { queueReview: true });
        if (!resolution) {
          lookupNotes.push(`[loc] unmapped subject: ${subject}`);
          continue;
        }
        const confidence = confidenceScale[resolution.matchType] ?? 'medium';
        const slug = resolution.slug;
        const snippet = {
          recordId: recordUrl,
          subject,
          matchType: resolution.matchType,
        };
        const existing = labelMap.get(slug);
        if (!existing) {
          labelMap.set(slug, {
            slug,
            name: subject,
            source: this.id,
            confidence,
            kind: inferKind(subject),
            raw: [snippet],
            id: recordUrl,
            url: recordUrl,
          });
        } else {
          const scoreRank = { high: 3, medium: 2, low: 1 } as const;
          if (Array.isArray(existing.raw)) {
            existing.raw.push(snippet);
          }
          if (scoreRank[confidence] > scoreRank[existing.confidence]) {
            existing.confidence = confidence;
          }
          if (!existing.id && recordUrl) {
            existing.id = recordUrl;
            existing.url = recordUrl;
          }
        }
      }
    }

    return {
      labels: Array.from(labelMap.values()),
      notes: lookupNotes.length ? notes.concat(lookupNotes) : notes,
    };
  }
}

export const locAdapter = new LibraryOfCongressAdapter();
