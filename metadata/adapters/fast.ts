import { fetch } from 'undici';
import pRetry from 'p-retry';
import { metadataConfig } from '../config.js';
import type {
  AdapterInput,
  AdapterLabel,
  AdapterResult,
  ConfidenceLevel,
  LookupContext,
  MetadataAdapter,
} from '../types.js';
import { buildCacheKey } from '../utils/cache.js';
import { RateLimiter } from '../utils/rate-limit.js';
import { resolveSlug, type SlugResolution } from '../utils/slug.js';

type FastDoc = {
  id?: string;
  idroot?: string | string[];
  auth?: string;
  type?: string;
  tag?: string[] | string;
  score?: number;
  links?: Array<{ source?: string; link?: string }>;
};

type FastResponse = {
  response?: {
    docs?: FastDoc[];
  };
};

const limiter = new RateLimiter(
  metadataConfig.sources.fast.rateLimitMs,
  metadataConfig.sources.fast.jitterMs,
);

const confidenceScale: Record<SlugResolution['matchType'], ConfidenceLevel> = {
  id: 'high',
  label: 'high',
  generated: 'medium',
};

type QueryAttempt = {
  query: string;
  label: string;
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'to',
  'in',
  'on',
  'for',
  'by',
  'with',
  'novel',
  'book',
  'story',
  'stories',
]);

function buildQueryAttempts(input: AdapterInput): QueryAttempt[] {
  const attempts: QueryAttempt[] = [];
  const seen = new Set<string>();
  const pushAttempt = (query: string | null | undefined, label: string) => {
    if (!query) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    attempts.push({ query: trimmed, label });
    seen.add(key);
  };

  const sanitizedTitle = input.title?.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (sanitizedTitle) {
    const authorBits = input.authors?.length ? ` ${input.authors.slice(0, 2).join(' ')}` : '';
    pushAttempt(`${sanitizedTitle}${authorBits}`.trim(), 'title');
    pushAttempt(sanitizedTitle, 'title-core');
    const tokens = sanitizedTitle.split(' ').filter(Boolean);
    if (tokens.length >= 2) {
      pushAttempt(tokens.slice(0, 2).join(' '), 'title-bigram');
    }
    const tokenCandidates = tokens
      .map((token) => token.trim())
      .filter(
        (token) => token.length >= 4 && !STOP_WORDS.has(token.toLowerCase()),
      )
      .slice(0, 3);
    for (const token of tokenCandidates) {
      pushAttempt(token, `token:${token.toLowerCase()}`);
    }
  }
  if (input.isbn13) {
    pushAttempt(input.isbn13, 'isbn13');
  }
  if (input.isbn10) {
    pushAttempt(input.isbn10, 'isbn10');
  }
  return attempts;
}

function deriveKind(doc: FastDoc): AdapterLabel['kind'] {
  const type = doc.type?.toLowerCase() ?? '';
  if (type.includes('topic') || type.includes('event')) return 'topic';
  if (type.includes('genre')) return 'genre';
  if (type.includes('geographic')) return 'place';
  if (type.includes('personal')) return 'person';
  if (type.includes('corporate')) return 'person';
  if (type.includes('form')) return 'format';
  return 'topic';
}

function safeLabel(doc: FastDoc): string | null {
  if (typeof doc.auth === 'string' && doc.auth.trim()) return doc.auth.trim();
  if (Array.isArray(doc.tag) && doc.tag.length && typeof doc.tag[0] === 'string') {
    return doc.tag[0].trim();
  }
  if (typeof doc.tag === 'string') return doc.tag.trim();
  return null;
}

export class FastAdapter implements MetadataAdapter {
  readonly id = 'fast';

  async lookup(input: AdapterInput, context: LookupContext): Promise<AdapterResult> {
    const notes: string[] = [];
    const config = metadataConfig.sources.fast;

    const attempts = buildQueryAttempts(input);
    if (!attempts.length) {
      notes.push('[fast] skipped – no suitable lookup key');
      return { labels: [], notes };
    }

    const cacheKey = buildCacheKey({
      isbn13: input.isbn13 ?? null,
      isbn10: input.isbn10 ?? null,
      doi: input.doi ?? null,
      oclc: input.oclc ?? null,
      title: input.title ?? null,
      authors: input.authors ?? [],
    });

    const cached = await context.cache.read<FastResponse>(this.id, cacheKey);
    let payload: FastResponse | null = cached?.data ?? null;
    if (!payload) {
      const { searchEndpoint, apiKey, maxSuggestions, maxRetries } = config;
      for (const attempt of attempts) {
        const params = new URLSearchParams({
          query: attempt.query,
          queryIndex: 'suggestall',
          queryReturn: 'auth,idroot,type,tag,score',
          suggest: 'autoSubject',
          rows: String(Math.min(maxSuggestions, 20)),
          wt: 'json',
        });
        if (apiKey) {
          params.set('apikey', apiKey);
        }
        const url = `${searchEndpoint}?${params.toString()}`;
        try {
          const response = await pRetry(
            async () => {
              await limiter.wait();
              const res = await fetch(url, {
                headers: { Accept: 'application/json' },
                signal: context.signal,
              });
              if (!res.ok) {
                throw new Error(`FAST responded with ${res.status}`);
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
                notes.push(`[fast] ${attempt.label} attempt ${error.attemptNumber} failed: ${reason}`);
              },
            },
          );
          payload = (await response.json()) as FastResponse;
          await context.cache.write(this.id, cacheKey, {
            fetchedAt: new Date().toISOString(),
            data: payload,
          });
          if (payload?.response?.docs?.length) {
            if (attempt.label !== attempts[0].label) {
              notes.push(`[fast] fallback succeeded via ${attempt.label}`);
            }
            break;
          }
          payload = null;
          notes.push(`[fast] ${attempt.label} returned no results`);
        } catch (error: any) {
          notes.push(`[fast] fetch failed for ${attempt.label}: ${error.message ?? error}`);
        }
      }
      if (!payload) {
        return { labels: [], notes };
      }
    } else {
      notes.push('[fast] cache hit');
    }

    const docs = payload?.response?.docs ?? [];
    if (!docs.length) {
      notes.push('[fast] no suggestions returned');
      return { labels: [], notes };
    }

    const labelMap = new Map<string, AdapterLabel>();
    const scoreRank = { high: 3, medium: 2, low: 1 } as const;
    const unmatched: string[] = [];

    const extractFastId = (doc: FastDoc): string | null => {
      const idroot = Array.isArray(doc.idroot) ? doc.idroot[0] : doc.idroot;
      if (typeof idroot === 'string' && idroot.trim()) {
        return idroot.trim();
      }
      if (typeof doc.id === 'string' && doc.id.trim()) {
        return doc.id.trim();
      }
      return null;
    };

    const toFastUrl = (fastId: string | null): string | undefined => {
      if (!fastId) return undefined;
      const numeric = fastId.replace(/^fst0*/, '');
      return numeric ? `https://id.worldcat.org/fast/${numeric}` : undefined;
    };

    for (const doc of docs.slice(0, config.maxSuggestions)) {
      const label = safeLabel(doc);
      if (!label) continue;
      const fastId = extractFastId(doc);
      const resolution = resolveSlug(this.id, label, fastId ?? undefined, { queueReview: true });
      if (!resolution) {
        unmatched.push(label);
        continue;
      }
      const confidence = confidenceScale[resolution.matchType] ?? 'medium';
      const slug = resolution.slug;
      const snippet = {
        fastId,
        label,
        matchType: resolution.matchType,
        score: doc.score ?? null,
        type: doc.type ?? null,
      };
      const existing = labelMap.get(slug);
      if (!existing) {
        labelMap.set(slug, {
          slug,
          name: label,
          source: this.id,
          confidence,
          kind: deriveKind(doc),
          raw: [snippet],
          id: fastId ?? undefined,
          url: toFastUrl(fastId),
        });
      } else {
        if (Array.isArray(existing.raw)) {
          existing.raw.push(snippet);
        }
        if (scoreRank[confidence] > scoreRank[existing.confidence]) {
          existing.confidence = confidence;
        }
        if (!existing.id && fastId) {
          existing.id = fastId;
          existing.url = toFastUrl(fastId);
        }
      }
    }

    if (unmatched.length) {
      notes.push(`[fast] unmatched subjects: ${unmatched.slice(0, 5).join('; ')}`);
    }

    return { labels: Array.from(labelMap.values()), notes };
  }
}

export const fastAdapter = new FastAdapter();
