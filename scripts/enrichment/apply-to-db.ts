import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import {
  ageMarkets,
  bookAgeMarkets,
  bookCrossTags,
  bookDomains,
  bookFormats,
  bookGenres,
  bookSubgenres,
  bookSupergenres,
  books,
  crossTags,
  domains,
  formats,
  genres,
  subgenres,
  supergenres,
} from '@shared/schema';
import { db } from '../../db/index.js';

const ENRICHMENT_DIR = 'enrichment_data';

const confidenceMap = {
  high: 0.9,
  medium: 0.75,
  low: 0.5,
} as const;

type ConfidenceKey = keyof typeof confidenceMap;

type EnrichmentFile = {
  authors?: { validated?: string[] };
  summary?: { new_summary?: string };
  cover_urls?: { recommended?: string };
  taxonomy?: {
    domain?: { slug?: string };
    supergenres?: Array<{ slug: string }>;
    genres?: Array<{ slug: string }>;
    subgenres?: Array<{ slug: string }>;
    cross_tags?: Array<{
      slug: string;
      confidence?: ConfidenceKey | string;
      method?: string;
      provenance_snapshot_ids?: string[];
    }>;
  };
  audience?: { slug?: string };
  format?: { slug?: string };
};

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { dryRun: false };
  const filtered: string[] = [];
  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    filtered.push(arg);
  }
  const bookId = filtered[0];
  if (!bookId) {
    throw new Error('Usage: node scripts/enrichment/apply-to-db.ts [--dry-run] <book_id>');
  }
  return { bookId, options };
}

function loadEnrichment(bookId: string): EnrichmentFile {
  const filePath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Enrichment file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeUuidArray(values?: string[]) {
  if (!Array.isArray(values)) return [];
  return values.filter((value) => typeof value === 'string' && value.length > 0);
}

async function apply(bookId: string, enrichment: EnrichmentFile, dryRun: boolean) {
  const summary: string[] = [];
  const book = await db.query.books.findFirst({ where: eq(books.id, bookId) });
  if (!book) {
    throw new Error(`Book ${bookId} not found`);
  }

  const authors = enrichment.authors?.validated ?? [];
  const description = enrichment.summary?.new_summary;
  const coverUrl = enrichment.cover_urls?.recommended;

  const taxonomy = enrichment.taxonomy ?? {};
  const supergenresList = taxonomy.supergenres ?? [];
  const genresList = taxonomy.genres ?? [];
  const subgenresList = taxonomy.subgenres ?? [];
  const crossTagsList = taxonomy.cross_tags ?? [];

  const formatSlug = enrichment.format?.slug;
  const audienceSlug = enrichment.audience?.slug;

  if (dryRun) {
    console.log('[enrichment] DRY RUN – no changes will be written');
  }

  const run = dryRun
    ? async (_fn: () => Promise<void> | void, desc: string) => {
        summary.push(desc);
      }
    : async (fn: () => Promise<void>, desc: string) => {
        await fn();
        summary.push(desc);
      };

  await run(async () => {
    const updates: Record<string, any> = {};
    if (authors.length) updates.authors = authors;
    if (description) updates.description = description;
    if (coverUrl) updates.coverUrl = coverUrl;
    if (Object.keys(updates).length) {
      await db.update(books).set(updates).where(eq(books.id, bookId));
    }
  }, 'Update books table');

  const domainSlug = taxonomy.domain?.slug;
  await run(async () => {
    await db.delete(bookDomains).where(eq(bookDomains.bookId, bookId));
    if (domainSlug) {
      const domain = await db.query.domains.findFirst({ where: eq(domains.slug, domainSlug) });
      if (domain) {
        await db.insert(bookDomains).values({ bookId, domainId: domain.id });
      } else {
        console.warn(`[enrichment] Domain slug '${domainSlug}' not found`);
      }
    }
  }, 'Reset domain');

  await run(async () => {
    await db.delete(bookSupergenres).where(eq(bookSupergenres.bookId, bookId));
    for (const entry of supergenresList) {
      const record = await db.query.supergenres.findFirst({ where: eq(supergenres.slug, entry.slug) });
      if (!record) {
        console.warn(`[enrichment] Supergenre slug '${entry.slug}' not found`);
        continue;
      }
      await db.insert(bookSupergenres).values({ bookId, supergenreId: record.id });
    }
  }, 'Reset supergenres');

  await run(async () => {
    await db.delete(bookGenres).where(eq(bookGenres.bookId, bookId));
    for (const entry of genresList) {
      const record = await db.query.genres.findFirst({ where: eq(genres.slug, entry.slug) });
      if (!record) {
        console.warn(`[enrichment] Genre slug '${entry.slug}' not found`);
        continue;
      }
      await db.insert(bookGenres).values({ bookId, genreId: record.id });
    }
  }, 'Reset genres');

  await run(async () => {
    await db.delete(bookSubgenres).where(eq(bookSubgenres.bookId, bookId));
    for (const entry of subgenresList) {
      const record = await db.query.subgenres.findFirst({ where: eq(subgenres.slug, entry.slug) });
      if (!record) {
        console.warn(`[enrichment] Subgenre slug '${entry.slug}' not found`);
        continue;
      }
      await db.insert(bookSubgenres).values({ bookId, subgenreId: record.id });
    }
  }, 'Reset subgenres');

  await run(async () => {
    await db.delete(bookCrossTags).where(eq(bookCrossTags.bookId, bookId));
    for (const tag of crossTagsList) {
      const crossTag = await db.query.crossTags.findFirst({ where: eq(crossTags.slug, tag.slug) });
      if (!crossTag) {
        console.warn(`[enrichment] Cross-tag slug '${tag.slug}' not found`);
        continue;
      }
      const confidenceKey = (tag.confidence ?? '').toLowerCase() as ConfidenceKey;
      const confidenceValue = confidenceMap[confidenceKey];
      const sourceIds = normalizeUuidArray(tag.provenance_snapshot_ids);
      await db.insert(bookCrossTags).values({
        bookId,
        crossTagId: crossTag.id,
        confidence: confidenceValue,
        method: tag.method ?? null,
        sourceIds: sourceIds.length ? sourceIds : null,
      });
    }
  }, 'Reset cross-tags');

  await run(async () => {
    await db.delete(bookFormats).where(eq(bookFormats.bookId, bookId));
    if (formatSlug) {
      const format = await db.query.formats.findFirst({ where: eq(formats.slug, formatSlug) });
      if (format) {
        await db.insert(bookFormats).values({ bookId, formatId: format.id });
      } else {
        console.warn(`[enrichment] Format slug '${formatSlug}' not found`);
      }
    }
  }, 'Reset format');

  await run(async () => {
    await db.delete(bookAgeMarkets).where(eq(bookAgeMarkets.bookId, bookId));
    if (audienceSlug) {
      const market = await db.query.ageMarkets.findFirst({ where: eq(ageMarkets.slug, audienceSlug) });
      if (market) {
        await db.insert(bookAgeMarkets).values({ bookId, ageMarketId: market.id });
      } else {
        console.warn(`[enrichment] Audience slug '${audienceSlug}' not found`);
      }
    }
  }, 'Reset audience');

  console.log(`[enrichment] Completed ${summary.length} steps for book ${bookId}`);
  summary.forEach((item) => console.log(`  - ${item}`));
}

async function main() {
  const { bookId, options } = parseArgs();
  const enrichment = loadEnrichment(bookId);
  await apply(bookId, enrichment, options.dryRun);
}

main().catch((error) => {
  console.error('[enrichment] apply failed:', error.message ?? error);
  process.exitCode = 1;
});
