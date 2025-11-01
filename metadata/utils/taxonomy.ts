import fs from 'node:fs';
import path from 'node:path';
import type { TaxonomyKind } from '../types.js';

export type TaxonomyMetadata = {
  slug: string;
  name: string;
  type: TaxonomyKind;
  group?: string | null;
  parent?: string | null;
};

type TaxonomyJson = {
  domains?: Array<{ slug: string; name?: string | null }>;
  supergenres?: Array<{ slug: string; name?: string | null }>;
  genres?: Array<{ slug: string; name?: string | null }>;
  subgenres?: Array<{ slug: string; name?: string | null; genre_slug?: string | null }>;
  cross_tags?: {
    by_group?: Record<
      string,
      Array<{ slug: string; name?: string | null; group?: string | null }>
    >;
  };
};

let taxonomyCache: Map<string, TaxonomyMetadata> | null = null;

function projectRoot(): string {
  return process.cwd();
}

function taxonomyFilePath(): string {
  return path.resolve(projectRoot(), 'bookshelves_complete_taxonomy.json');
}

function buildTaxonomyCache(): Map<string, TaxonomyMetadata> {
  const filePath = taxonomyFilePath();
  const exists = fs.existsSync(filePath);
  if (!exists) {
    console.warn(`[metadata] taxonomy file missing at ${filePath}`);
    return new Map();
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as TaxonomyJson;
  const map = new Map<string, TaxonomyMetadata>();

  const register = (entry: TaxonomyMetadata) => {
    if (!entry.slug) return;
    if (!map.has(entry.slug)) {
      map.set(entry.slug, entry);
    }
  };

  raw.domains?.forEach((domain) => {
    register({
      slug: domain.slug,
      name: domain.name ?? domain.slug,
      type: 'domain',
    });
  });

  raw.supergenres?.forEach((supergenre) => {
    register({
      slug: supergenre.slug,
      name: supergenre.name ?? supergenre.slug,
      type: 'supergenre',
    });
  });

  raw.genres?.forEach((genre) => {
    register({
      slug: genre.slug,
      name: genre.name ?? genre.slug,
      type: 'genre',
    });
  });

  raw.subgenres?.forEach((subgenre) => {
    register({
      slug: subgenre.slug,
      name: subgenre.name ?? subgenre.slug,
      type: 'subgenre',
      parent: subgenre.genre_slug ?? null,
    });
  });

  const crossTags = raw.cross_tags?.by_group ?? {};
  Object.entries(crossTags).forEach(([group, entries]) => {
    entries.forEach((tag) => {
      register({
        slug: tag.slug,
        name: tag.name ?? tag.slug,
        type: 'cross_tag',
        group: tag.group ?? group,
      });
    });
  });

  return map;
}

export function getTaxonomyMetadata(slug: string): TaxonomyMetadata | null {
  if (!taxonomyCache) {
    taxonomyCache = buildTaxonomyCache();
  }
  return taxonomyCache.get(slug) ?? null;
}
