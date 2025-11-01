export type AdapterId = 'loc' | 'fast' | 'wikidata';

export type TaxonomyKind =
  | 'domain'
  | 'supergenre'
  | 'genre'
  | 'subgenre'
  | 'cross_tag'
  | 'format'
  | 'audience'
  | 'unknown';

export type AdapterInput = {
  isbn10?: string | null;
  isbn13?: string | null;
  oclc?: string | null;
  doi?: string | null;
  title?: string | null;
  authors?: string[];
};

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type AdapterLabel = {
  slug: string;
  name: string;
  source: AdapterId;
  confidence: ConfidenceLevel;
  kind: 'genre' | 'topic' | 'setting' | 'audience' | 'format' | 'person' | 'place';
  raw: unknown;
  id?: string;
  url?: string;
  notes?: string[];
  taxonomyType?: TaxonomyKind;
  taxonomyGroup?: string | null;
  taxonomyParent?: string | null;
};

export type AdapterResult = {
  labels: AdapterLabel[];
  notes?: string[];
};

export type LookupContext = {
  cache: CacheClient;
  signal?: AbortSignal;
};

export type CacheEntry<T> = {
  fetchedAt: string;
  data: T;
};

export interface CacheClient {
  read<T = unknown>(source: AdapterId, key: string): Promise<CacheEntry<T> | null>;
  write<T = unknown>(source: AdapterId, key: string, value: CacheEntry<T>): Promise<void>;
}

export interface MetadataAdapter {
  id: AdapterId;
  lookup(input: AdapterInput, context: LookupContext): Promise<AdapterResult>;
}
