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

function pickQuery(input: AdapterInput): string | null {
  if (input.isbn13) return input.isbn13;
  if (input.isbn10) return input.isbn10;
  if (input.title) {
    const authorBits = input.authors?.length ? ` ${input.authors[0]}` : '';
    return `${input.title}${authorBits}`;
  }
  return null;
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
    if (!config.apiKey) {
      notes.push('[fast] skipped – FAST_API_KEY not configured');
      return { labels: [], notes };
    }

    const query = pickQuery(input);
    if (!query) {
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
      const params = new URLSearchParams({
        query,
        queryReturn: 'idroot,auth,type,tag,score',
        queryIndex: 'suggestall',
        suggest: 'auto',
        maximumSuggestions: String(maxSuggestions),
        rows: String(maxSuggestions),
        format: 'json',
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
              notes.push(`[fast] attempt ${error.attemptNumber} failed: ${reason}`);
            },
          },
        );
        payload = (await response.json()) as FastResponse;
        await context.cache.write(this.id, cacheKey, {
          fetchedAt: new Date().toISOString(),
          data: payload,
        });
      } catch (error: any) {
        notes.push(`[fast] fetch failed: ${error.message ?? error}`);
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

    for (const doc of docs.slice(0, config.maxSuggestions)) {
      const label = safeLabel(doc);
      if (!label) continue;
      const resolution = resolveSlug(this.id, label, doc.id, { queueReview: true });
      if (!resolution) {
        unmatched.push(label);
        continue;
      }
      const confidence = confidenceScale[resolution.matchType] ?? 'medium';
      const slug = resolution.slug;
      const snippet = {
        fastId: doc.id ?? null,
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
          id: doc.id,
          url: doc.id ? `https://id.worldcat.org/fast/${doc.id.replace(/^fst0*/, '')}` : undefined,
        });
      } else {
        if (Array.isArray(existing.raw)) {
          existing.raw.push(snippet);
        }
        if (scoreRank[confidence] > scoreRank[existing.confidence]) {
          existing.confidence = confidence;
        }
        if (!existing.id && doc.id) {
          existing.id = doc.id;
          existing.url = `https://id.worldcat.org/fast/${doc.id.replace(/^fst0*/, '')}`;
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
