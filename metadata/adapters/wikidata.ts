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

type WikidataBinding = Record<
  string,
  {
    type: string;
    value: string;
  }
>;

type WikidataResult = {
  head: { vars: string[] };
  results: { bindings: WikidataBinding[] };
};

const limiter = new RateLimiter(
  metadataConfig.sources.wikidata.rateLimitMs,
  metadataConfig.sources.wikidata.jitterMs,
);

const confidenceScale: Record<SlugResolution['matchType'], ConfidenceLevel> = {
  id: 'high',
  label: 'high',
  generated: 'medium',
};

const scoreRank = { high: 3, medium: 2, low: 1 } as const;

function extractQid(raw?: string): string | null {
  if (!raw) return null;
  const segments = raw.split('/');
  const last = segments[segments.length - 1];
  return last ?? null;
}

function makeItemUrl(qid?: string | null): string | undefined {
  if (!qid) return undefined;
  return `https://www.wikidata.org/wiki/${qid}`;
}

function buildIdentifierValues(input: AdapterInput): string[] {
  const values = new Set<string>();
  if (input.isbn13) values.add(input.isbn13.replace(/[^0-9Xx]/g, ''));
  if (input.isbn10) values.add(input.isbn10.replace(/[^0-9Xx]/g, ''));
  if (input.doi) values.add(input.doi.trim());
  return Array.from(values);
}

function buildIsbnQuery(identifiers: string[]): string {
  const filters = identifiers
    .map(
      (value) => `
  { ?item wdt:P212 "${value}" } 
  UNION { ?item wdt:P957 "${value}" }
  UNION { ?item wdt:P356 "${value}" }
`,
    )
    .join('\n');

  return `
SELECT DISTINCT ?item ?itemLabel ?genre ?genreLabel ?subject ?subjectLabel ?depicts ?depictsLabel ?country ?countryLabel WHERE {
  {
    ${filters}
  }
  OPTIONAL { ?item wdt:P136 ?genre . }
  OPTIONAL { ?item wdt:P921 ?subject . }
  OPTIONAL { ?item wdt:P180 ?depicts . }
  OPTIONAL { ?item wdt:P495 ?country . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200
`.trim();
}

function buildTitleQuery(title: string, authors: string[]): string {
  const authorFilters = authors.length
    ? `?item wdt:P50 ?author . ?author rdfs:label "${authors[0]}"@en .`
    : '';
  return `
SELECT DISTINCT ?item ?itemLabel ?genre ?genreLabel ?subject ?subjectLabel ?depicts ?depictsLabel ?country ?countryLabel WHERE {
  ?item rdfs:label "${title}"@en .
  ${authorFilters}
  OPTIONAL { ?item wdt:P136 ?genre . }
  OPTIONAL { ?item wdt:P921 ?subject . }
  OPTIONAL { ?item wdt:P180 ?depicts . }
  OPTIONAL { ?item wdt:P495 ?country . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 100
  `.trim();
}

async function runQuery(
  sparql: string,
  context: LookupContext,
  notes: string[],
): Promise<WikidataResult | null> {
  const { endpoint, maxRetries, userAgent } = metadataConfig.sources.wikidata;
  const params = new URLSearchParams({
    query: sparql,
    format: 'json',
  });
  const url = `${endpoint}?${params.toString()}`;

  try {
    const response = await pRetry(
      async () => {
        await limiter.wait();
        const res = await fetch(url, {
          headers: {
            Accept: 'application/sparql-results+json',
            'User-Agent': userAgent,
          },
          signal: context.signal,
        });
        if (!res.ok) {
          throw new Error(`Wikidata responded with ${res.status}`);
        }
        return res;
      },
      {
        retries: maxRetries,
        factor: 1.6,
        onFailedAttempt(error) {
          const reason =
            (error as any)?.message ??
            (error as any)?.shortMessage ??
            `attempt ${error.attemptNumber} failed`;
          notes.push(`[wikidata] attempt ${error.attemptNumber} failed: ${reason}`);
        },
      },
    );
    return (await response.json()) as WikidataResult;
  } catch (error: any) {
    notes.push(`[wikidata] fetch failed: ${error.message ?? error}`);
    return null;
  }
}

type Aggregated = {
  qid: string | null;
  labels: AdapterLabel[];
  notes: string[];
};

function pushLabel(
  aggregator: Map<string, AdapterLabel>,
  sourceId: string | null,
  label: string,
  kind: AdapterLabel['kind'],
  raw: Record<string, unknown>,
): void {
  const resolution = resolveSlug('wikidata', label, sourceId ?? undefined, { queueReview: true });
  if (!resolution) {
    return;
  }
  const normalizedId = extractQid(sourceId ?? undefined);
  const confidence = confidenceScale[resolution.matchType] ?? 'medium';
  const slug = resolution.slug;
  const snippet = { ...raw, matchType: resolution.matchType };
  const existing = aggregator.get(slug);
  if (!existing) {
    aggregator.set(slug, {
      slug,
      name: label,
      source: 'wikidata',
      confidence,
      kind,
      raw: [snippet],
      id: normalizedId ?? undefined,
      url: makeItemUrl(normalizedId ?? undefined),
    });
  } else {
    if (Array.isArray(existing.raw)) {
      existing.raw.push(snippet);
    }
    if (scoreRank[confidence] > scoreRank[existing.confidence]) {
      existing.confidence = confidence;
    }
    if (!existing.id && normalizedId) {
      existing.id = normalizedId;
      existing.url = makeItemUrl(normalizedId);
    }
  }
}

export class WikidataAdapter implements MetadataAdapter {
  readonly id = 'wikidata';

  async lookup(input: AdapterInput, context: LookupContext): Promise<AdapterResult> {
    const notes: string[] = [];
    const cacheKey = buildCacheKey({
      isbn13: input.isbn13 ?? null,
      isbn10: input.isbn10 ?? null,
      doi: input.doi ?? null,
      oclc: input.oclc ?? null,
      title: input.title ?? null,
      authors: input.authors ?? [],
    });
    const cached = await context.cache.read<WikidataResult>(this.id, cacheKey);
    let payload: WikidataResult | null = null;
    if (cached?.data?.results?.bindings?.length) {
      payload = cached.data;
      notes.push('[wikidata] cache hit');
    }

    if (!payload) {
      const identifiers = buildIdentifierValues(input);
      let attemptedIdentifierQuery = false;

      if (identifiers.length) {
        attemptedIdentifierQuery = true;
        const identifierQuery = buildIsbnQuery(identifiers);
        const identifierPayload = await runQuery(identifierQuery, context, notes);
        if (identifierPayload?.results?.bindings?.length) {
          payload = identifierPayload;
        }
      }

      if (!payload && input.title) {
        if (attemptedIdentifierQuery) {
          notes.push('[wikidata] retrying with title search');
        }
        const titleQuery = buildTitleQuery(input.title, input.authors ?? []);
        const titlePayload = await runQuery(titleQuery, context, notes);
        if (titlePayload?.results?.bindings?.length) {
          payload = titlePayload;
        }
      }

      if (!payload) {
        if (!identifiers.length && !input.title) {
          notes.push('[wikidata] skipped – no identifiers available');
        } else {
          notes.push('[wikidata] no matches returned');
        }
        return { labels: [], notes };
      }

      await context.cache.write(this.id, cacheKey, {
        fetchedAt: new Date().toISOString(),
        data: payload,
      });
    }

    const bindings = payload.results?.bindings ?? [];
    if (!bindings.length) {
      notes.push('[wikidata] no matches returned');
      return { labels: [], notes };
    }

    const aggregator = new Map<string, AdapterLabel>();
    const unmatched: string[] = [];
    let currentQid: string | null = null;

    for (const binding of bindings) {
      const qid = extractQid(binding.item?.value);
      if (qid && !currentQid) currentQid = qid;
      if (binding.genreLabel?.value) {
        pushLabel(aggregator, binding.genre?.value ?? qid, binding.genreLabel.value, 'genre', {
          property: 'P136',
          qid,
        });
      }
      if (binding.subjectLabel?.value) {
        pushLabel(aggregator, binding.subject?.value ?? qid, binding.subjectLabel.value, 'topic', {
          property: 'P921',
          qid,
        });
      }
      if (binding.depictsLabel?.value) {
        pushLabel(aggregator, binding.depicts?.value ?? qid, binding.depictsLabel.value, 'topic', {
          property: 'P180',
          qid,
        });
      }
      if (binding.countryLabel?.value) {
        pushLabel(aggregator, binding.country?.value ?? qid, binding.countryLabel.value, 'place', {
          property: 'P495',
          qid,
        });
      }
    }

    if (!aggregator.size) {
      unmatched.push('no subjects mapped');
    }

    if (unmatched.length) {
      notes.push(`[wikidata] unmatched: ${unmatched.join('; ')}`);
    }

    const labels = Array.from(aggregator.values()).map((label) => {
      if (!label.url && currentQid) {
        label.url = makeItemUrl(currentQid);
      }
      if (!label.id && currentQid) {
        label.id = currentQid;
      }
      return label;
    });

    return { labels, notes };
  }
}

export const wikidataAdapter = new WikidataAdapter();
