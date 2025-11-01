import path from 'node:path';

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const projectRoot = process.cwd();

export const metadataConfig = {
  cacheDir: path.resolve(projectRoot, process.env.METADATA_CACHE_DIR ?? '.cache/metadata'),
  reviewQueuePath: path.resolve(projectRoot, 'metadata/review/new-subjects.json'),
  sources: {
    loc: {
      rateLimitMs: toNumber(process.env.METADATA_LOC_MIN_DELAY_MS, 400),
      jitterMs: toNumber(process.env.METADATA_LOC_JITTER_MS, 150),
      searchEndpoint:
        process.env.METADATA_LOC_SEARCH_ENDPOINT ?? 'https://www.loc.gov/books/',
      maxRetries: toNumber(process.env.METADATA_LOC_MAX_RETRIES, 2),
      userAgent:
        process.env.METADATA_LOC_USER_AGENT ??
        'BookshelvesMetadataBot/1.0 (+https://bookshelves.app)',
    },
    fast: {
      rateLimitMs: toNumber(process.env.METADATA_FAST_MIN_DELAY_MS, 350),
      jitterMs: toNumber(process.env.METADATA_FAST_JITTER_MS, 150),
      searchEndpoint:
        process.env.METADATA_FAST_SEARCH_ENDPOINT ??
        'https://fast.oclc.org/searchfast/fastsuggest',
      apiKey: process.env.FAST_API_KEY || '',
      maxSuggestions: toNumber(process.env.METADATA_FAST_MAX_SUGGESTIONS, 10),
      maxRetries: toNumber(process.env.METADATA_FAST_MAX_RETRIES, 2),
    },
    wikidata: {
      rateLimitMs: toNumber(process.env.METADATA_WIKIDATA_MIN_DELAY_MS, 500),
      jitterMs: toNumber(process.env.METADATA_WIKIDATA_JITTER_MS, 200),
      endpoint:
        process.env.METADATA_WIKIDATA_ENDPOINT ?? 'https://query.wikidata.org/sparql',
      userAgent:
        process.env.WIKIDATA_USER_AGENT ?? 'BookshelvesMetadataBot/1.0 (+https://bookshelves.app)',
      maxRetries: toNumber(process.env.METADATA_WIKIDATA_MAX_RETRIES, 2),
    },
  },
} as const;

export type MetadataConfig = typeof metadataConfig;
