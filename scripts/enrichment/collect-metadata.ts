import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { books, editions } from '@shared/schema';
import { MetadataOrchestrator, type AggregatedLabel } from '../../metadata/index.js';
import type { AdapterId, AdapterInput } from '../../metadata/types.js';

const ENRICHMENT_DIR = 'enrichment_data';

type EnrichmentFile = Record<string, any>;

type CliOptions = {
  sources: AdapterId[] | null;
  dryRun: boolean;
};

function usage(): never {
  console.error(
    'Usage: node --import tsx scripts/enrichment/collect-metadata.ts <book_id> [--sources=loc,fast,wikidata] [--dry-run]',
  );
  process.exit(1);
}

function normalizeIsbn(value?: string | null): { isbn10?: string | null; isbn13?: string | null } {
  if (!value) return {};
  const digits = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (digits.length === 13) {
    return { isbn13: digits };
  }
  if (digits.length === 10) {
    return { isbn10: digits };
  }
  return {};
}

function parseSources(configValue: string | undefined, available: AdapterId[]): AdapterId[] | null {
  if (!configValue) return null;
  const requested = configValue
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean) as AdapterId[];
  const valid = requested.filter((source) => available.includes(source));
  return valid.length ? Array.from(new Set(valid)) : null;
}

function parseArgs(available: AdapterId[]): { bookId: string; options: CliOptions } {
  const args = process.argv.slice(2);
  if (!args.length) usage();
  let bookId: string | null = null;
  let sources: AdapterId[] | null = null;
  let dryRun = false;
  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--sources=')) {
      const value = arg.split('=')[1] ?? '';
      sources = parseSources(value, available);
      continue;
    }
    if (!bookId) {
      bookId = arg;
      continue;
    }
  }
  if (!bookId) usage();
  const envSources = parseSources(process.env.METADATA_SOURCES, available);
  return {
    bookId,
    options: {
      sources: sources ?? envSources,
      dryRun,
    },
  };
}

async function loadBook(bookId: string) {
  const book = await db.query.books.findFirst({
    columns: {
      id: true,
      title: true,
      authors: true,
      isbn: true,
    },
    where: eq(books.id, bookId),
  });
  if (!book) {
    throw new Error(`Book ${bookId} not found in books table`);
  }
  const edition = await db.query.editions.findFirst({
    columns: {
      id: true,
      isbn10: true,
      isbn13: true,
    },
    where: eq(editions.legacyBookId, bookId),
  });
  return { book, edition };
}

function resolveAdapterInput({
  book,
  edition,
}: Awaited<ReturnType<typeof loadBook>>): AdapterInput {
  const inherited = normalizeIsbn(book.isbn);
  const isbn10 = edition?.isbn10 ?? inherited.isbn10 ?? null;
  const isbn13 = edition?.isbn13 ?? inherited.isbn13 ?? null;
  return {
    isbn10,
    isbn13,
    doi: null,
    oclc: null,
    title: book.title,
    authors: book.authors ?? [],
  };
}

function loadEnrichment(bookId: string): { filePath: string; data: EnrichmentFile } {
  const filePath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  ensureEnrichmentDir();
  
  if (!fs.existsSync(filePath)) {
    // Create initial enrichment file structure
    const initialData: EnrichmentFile = {
      input_snapshot: {
        book_id: bookId,
        timestamp: new Date().toISOString(),
      },
    };
    fs.writeFileSync(filePath, `${JSON.stringify(initialData, null, 2)}\n`, 'utf8');
    return { filePath, data: initialData };
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { filePath, data };
}

function ensureEnrichmentDir(): void {
  if (!fs.existsSync(ENRICHMENT_DIR)) {
    fs.mkdirSync(ENRICHMENT_DIR, { recursive: true });
  }
}

function serializeAggregatedSubjects(labels: AggregatedLabel[]): any[] {
  const priority = { high: 3, medium: 2, low: 1 } as const;
  return labels
    .slice()
    .sort((a, b) => {
      const diff = priority[b.confidence] - priority[a.confidence];
      if (diff !== 0) return diff;
      return a.slug.localeCompare(b.slug);
    })
    .map((label) => ({
      slug: label.slug,
      name: label.name,
      kind: label.kind,
      confidence: label.confidence,
      taxonomy_type: label.taxonomyType,
      taxonomy_group: label.taxonomyGroup ?? null,
      taxonomy_parent: label.taxonomyParent ?? null,
      sources: label.sources,
      raw: label.raw,
    }));
}

function writeEnrichment(
  filePath: string,
  data: EnrichmentFile,
  dryRun: boolean,
): void {
  if (dryRun) {
    console.log('[metadata] dry-run enabled; skipping write.');
    return;
  }
  ensureEnrichmentDir();
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const orchestrator = new MetadataOrchestrator();
  const { bookId, options } = parseArgs(orchestrator.availableSources);
  const { book, edition } = await loadBook(bookId);
  const input = resolveAdapterInput({ book, edition });
  const sources = options.sources ?? orchestrator.availableSources;
  console.log(
    `[metadata] Running adapters for ${book.title} (${bookId}) :: sources=${sources.join(', ')}`,
  );
  const aggregated = await orchestrator.lookupAll(input, { sources });
  const { filePath, data } = loadEnrichment(bookId);

  const perSource = Object.fromEntries(
    Object.entries(aggregated.bySource).map(([sourceId, labels]) => [
      sourceId,
      {
        labels: labels.map((label) => ({
          slug: label.slug,
          name: label.name,
          kind: label.kind,
          confidence: label.confidence,
          taxonomy_type: label.taxonomyType ?? null,
          taxonomy_group: label.taxonomyGroup ?? null,
          taxonomy_parent: label.taxonomyParent ?? null,
          id: label.id ?? null,
          url: label.url ?? null,
          raw: label.raw,
          notes: label.notes ?? [],
        })),
        notes: aggregated.notes[sourceId as AdapterId] ?? [],
      },
    ]),
  );

  const mergedSubjects = serializeAggregatedSubjects(aggregated.labels);
  data.external_metadata = {
    last_run: new Date().toISOString(),
    sources_enabled: sources,
    input_snapshot: {
      title: book.title,
      authors: book.authors,
      isbn10: input.isbn10 ?? null,
      isbn13: input.isbn13 ?? null,
      edition_id: edition?.id ?? null,
    },
    sources: perSource,
    merged: {
      subjects: mergedSubjects,
    },
  };

  if (!data.taxonomy) {
    data.taxonomy = {};
  }
  data.taxonomy.external_subjects = mergedSubjects.map((subject) => ({
    slug: subject.slug,
    name: subject.name,
    confidence: subject.confidence,
    kind: subject.kind,
    taxonomy_type: subject.taxonomy_type,
    taxonomy_group: subject.taxonomy_group,
    taxonomy_parent: subject.taxonomy_parent,
    sources: subject.sources,
  }));

  writeEnrichment(filePath, data, options.dryRun);
  console.log(
    `[metadata] Updated external metadata for ${book.title} :: ${mergedSubjects.length} subjects collected.`,
  );
}

main().catch((error) => {
  console.error('[metadata] collection failed:', error.message ?? error);
  process.exitCode = 1;
});
