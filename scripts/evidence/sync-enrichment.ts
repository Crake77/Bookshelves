import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { editions } from '@shared/schema';
import { loadEvidencePack } from './index.ts';

type Mode = 'auto' | 'book' | 'work';

function parseArgs(argv: string[]): { id: string; mode: Mode } {
  let mode: Mode = 'auto';
  let id: string | null = null;

  for (const arg of argv) {
    if (arg === '--book') {
      mode = 'book';
      continue;
    }
    if (arg === '--work') {
      mode = 'work';
      continue;
    }
    if (!id) {
      id = arg;
    }
  }

  if (!id) {
    throw new Error('Usage: node scripts/evidence/sync-enrichment.ts [--book|--work] <id>');
  }

  return { id, mode };
}

async function resolveWorkId(id: string, mode: Mode): Promise<{ workId: string; legacyBookId?: string } | null> {
  if (mode === 'work') {
    return { workId: id };
  }

  const edition = await db.query.editions.findFirst({
    where: eq(editions.legacyBookId, id),
  });

  if (edition) {
    return { workId: edition.workId, legacyBookId: id };
  }

  if (mode === 'book') {
    return null;
  }

  // Fallback: treat provided id as work id
  return { workId: id };
}

function readEnrichmentFile(bookId: string): Record<string, any> {
  const filePath = path.join('enrichment_data', `${bookId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Enrichment file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeEnrichmentFile(bookId: string, data: Record<string, any>): void {
  const filePath = path.join('enrichment_data', `${bookId}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[evidence] wrote ${data.evidence?.sources?.length ?? 0} sources to ${filePath}`);
}

async function main() {
  const { id, mode } = parseArgs(process.argv.slice(2));
  const resolved = await resolveWorkId(id, mode);
  if (!resolved) {
    throw new Error(`Unable to resolve work for book id ${id}`);
  }

  const pack = await loadEvidencePack(resolved.workId);
  if (!pack) {
    throw new Error(`No work found for ${resolved.workId}`);
  }

  if (!pack.sources.length) {
    console.warn(`[evidence] No snapshots found for work ${resolved.workId}`);
  }

  const bookId = resolved.legacyBookId ?? id;
  const enrichment = readEnrichmentFile(bookId);

  enrichment.evidence = {
    work_id: pack.workId,
    work_title: pack.workTitle,
    work_ref: pack.workRefValue
      ? { type: pack.workRefType, value: pack.workRefValue }
      : null,
    fetched_at: pack.fetchedAt,
    sources: pack.sources.map((source) => ({
      snapshot_id: source.id,
      source: source.source,
      source_key: source.sourceKey,
      revision: source.revision,
      url: source.url,
      license: source.license,
      fetched_at: source.fetchedAt,
      sha256: source.sha256,
      extract: source.extract,
    })),
  };

  writeEnrichmentFile(bookId, enrichment);
}

main().catch((error) => {
  console.error('[evidence] sync failed:', error.message ?? error);
  process.exitCode = 1;
});
