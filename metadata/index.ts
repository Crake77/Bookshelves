import { metadataConfig } from './config.js';
import type {
  AdapterId,
  AdapterInput,
  AdapterLabel,
  CacheClient,
  ConfidenceLevel,
  MetadataAdapter,
  TaxonomyKind,
} from './types.js';
import { FileCache } from './utils/cache.js';
import { locAdapter } from './adapters/loc.js';
import { fastAdapter } from './adapters/fast.js';
import { wikidataAdapter } from './adapters/wikidata.js';
import { getTaxonomyMetadata } from './utils/taxonomy.js';

const confidenceRank: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function createRawRecord(
  source?: AdapterId,
  initial?: unknown[],
): Record<AdapterId, unknown[]> {
  return {
    loc: source === 'loc' ? initial ?? [] : [],
    fast: source === 'fast' ? initial ?? [] : [],
    wikidata: source === 'wikidata' ? initial ?? [] : [],
  };
}

export type AggregatedLabel = {
  slug: string;
  name: string;
  kind: AdapterLabel['kind'];
  confidence: ConfidenceLevel;
  taxonomyType: TaxonomyKind;
  taxonomyGroup?: string | null;
  taxonomyParent?: string | null;
  sources: Array<{
    source: AdapterId;
    confidence: ConfidenceLevel;
    id?: string;
    url?: string;
  }>;
  raw: Record<AdapterId, unknown[]>;
};

export type AdapterLookupNotes = Record<AdapterId, string[] | undefined>;

export type AggregatedMetadata = {
  labels: AggregatedLabel[];
  bySource: Record<AdapterId, AdapterLabel[]>;
  notes: AdapterLookupNotes;
};

export type LookupOptions = {
  sources?: AdapterId[];
  signal?: AbortSignal;
};

export type OrchestratorOptions = {
  cache?: CacheClient;
  adapters?: MetadataAdapter[];
};

function mergeLabel(
  accumulator: Map<string, AggregatedLabel>,
  label: AdapterLabel,
): void {
  const taxonomyMetadata = getTaxonomyMetadata(label.slug);
  const taxonomyType: TaxonomyKind = taxonomyMetadata?.type ?? label.taxonomyType ?? 'unknown';
  const taxonomyGroup = taxonomyMetadata?.group ?? label.taxonomyGroup ?? null;
  const taxonomyParent = taxonomyMetadata?.parent ?? label.taxonomyParent ?? null;
  const existing = accumulator.get(label.slug);
  if (!existing) {
    const initialRaw = Array.isArray(label.raw) ? label.raw : [label.raw];
    accumulator.set(label.slug, {
      slug: label.slug,
      name: label.name,
      kind: label.kind,
      confidence: label.confidence,
      taxonomyType,
      taxonomyGroup,
      taxonomyParent,
      sources: [
        {
          source: label.source,
          confidence: label.confidence,
          id: label.id,
          url: label.url,
        },
      ],
      raw: createRawRecord(label.source, initialRaw),
    });
    return;
  }

  if (confidenceRank[label.confidence] > confidenceRank[existing.confidence]) {
    existing.confidence = label.confidence;
    existing.name = label.name;
    existing.kind = label.kind;
  }
  if (existing.taxonomyType === 'unknown' && taxonomyType !== 'unknown') {
    existing.taxonomyType = taxonomyType;
  }
  if (!existing.taxonomyGroup && taxonomyGroup) {
    existing.taxonomyGroup = taxonomyGroup;
  }
  if (!existing.taxonomyParent && taxonomyParent) {
    existing.taxonomyParent = taxonomyParent;
  }
  existing.sources.push({
    source: label.source,
    confidence: label.confidence,
    id: label.id,
    url: label.url,
  });
  if (!existing.raw[label.source]) {
    existing.raw[label.source] = [];
  }
  if (Array.isArray(label.raw)) {
    existing.raw[label.source].push(...label.raw);
  } else {
    existing.raw[label.source].push(label.raw);
  }
}

export class MetadataOrchestrator {
  private readonly cache: CacheClient;
  private readonly adapters: Map<AdapterId, MetadataAdapter>;

  constructor(options: OrchestratorOptions = {}) {
    this.cache = options.cache ?? new FileCache();
    const defaultAdapters: MetadataAdapter[] = [locAdapter, fastAdapter, wikidataAdapter];
    const configuredAdapters = options.adapters ?? defaultAdapters;
    this.adapters = new Map(configuredAdapters.map((adapter) => [adapter.id, adapter]));
  }

  get availableSources(): AdapterId[] {
    return Array.from(this.adapters.keys());
  }

  async lookupAll(input: AdapterInput, options: LookupOptions = {}): Promise<AggregatedMetadata> {
    const requestedSources = options.sources ?? this.availableSources;
    const bySource: Record<AdapterId, AdapterLabel[]> = {
      loc: [],
      fast: [],
      wikidata: [],
    };
    const notes: AdapterLookupNotes = {
      loc: undefined,
      fast: undefined,
      wikidata: undefined,
    };
    const aggregate = new Map<string, AggregatedLabel>();

    for (const sourceId of requestedSources) {
      const adapter = this.adapters.get(sourceId);
      if (!adapter) continue;
      const result = await adapter.lookup(input, {
        cache: this.cache,
        signal: options.signal,
      });
      bySource[sourceId] = result.labels;
      if (result.notes?.length) {
        notes[sourceId] = result.notes;
      }
      for (const label of result.labels) {
        mergeLabel(aggregate, label);
      }
    }

    return {
      labels: Array.from(aggregate.values()),
      bySource,
      notes,
    };
  }
}

export const metadataOrchestrator = new MetadataOrchestrator();
export const metadataSettings = metadataConfig;
