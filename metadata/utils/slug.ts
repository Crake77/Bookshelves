import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AdapterId } from '../types.js';
import { metadataConfig } from '../config.js';
import { queueUnknownSubject } from './review-queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type MappingFile = {
  ids?: Record<string, string>;
  labels?: Record<string, string>;
};

function loadMapping(fileName: string): MappingFile {
  const filePath = path.join(__dirname, '..', 'mappings', fileName);
  if (!fs.existsSync(filePath)) {
    return { ids: {}, labels: {} };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as MappingFile;
}

const locMapping = loadMapping('loc-to-slug.json');
const fastMapping = loadMapping('fast-to-slug.json');
const wikidataMapping = loadMapping('wikidata-to-slug.json');

const mappingIndex: Record<AdapterId, MappingFile> = {
  loc: locMapping,
  fast: fastMapping,
  wikidata: wikidataMapping,
};

function normalize(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export type ResolveSlugOptions = {
  strict?: boolean;
  queueReview?: boolean;
};

export type SlugResolution = {
  slug: string;
  matchType: 'id' | 'label' | 'generated';
};

export function resolveSlug(
  source: AdapterId,
  value: string,
  id?: string,
  options: ResolveSlugOptions = { queueReview: true },
): SlugResolution | null {
  const normalizedValue = normalize(value);
  const normalizedId = normalize(id);
  const mapping = mappingIndex[source];
  const tryIds = [normalizedId, normalizedId?.replace(/^https?:\/\//, ''), normalizedId?.split('/').pop()].filter(
    Boolean,
  ) as string[];

  for (const candidate of tryIds) {
    const slug = candidate ? mapping.ids?.[candidate] : undefined;
    if (slug) {
      return { slug, matchType: 'id' };
    }
  }

  if (normalizedValue) {
    const slug =
      mapping.labels?.[normalizedValue] ??
      mapping.labels?.[normalizedValue.replace(/[–—]/g, '-')] ??
      null;
    if (slug) {
      return { slug, matchType: 'label' };
    }
  }

  if (!options.strict) {
    const generated = normalizedValue ? toSlug(normalizedValue) : null;
    if (generated) {
      return { slug: generated, matchType: 'generated' };
    }
  }

  if (options.queueReview !== false && normalizedValue) {
    queueUnknownSubject({
      source,
      id: id ?? null,
      label: value,
      cachePath: metadataConfig.reviewQueuePath,
    }).catch((error) => {
      console.warn(`[metadata] Failed to queue subject for review (${source}):`, error);
    });
  }

  return null;
}
