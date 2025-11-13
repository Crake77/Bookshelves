#!/usr/bin/env node
/**
 * Sync evidence packs for all books in the database
 * 
 * Usage: npm run evidence:sync-all
 * 
 * This script:
 * 1. Finds all books in the database
 * 2. For each book, resolves its work ID (if migrated) or book ID
 * 3. Syncs evidence packs from source_snapshots table to enrichment_data JSON files
 */

import { db } from "../../db/index.js";
import { books, editions, works } from "@shared/schema.js";
import { eq, isNotNull } from "drizzle-orm";
import { loadEvidencePack } from "./index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readEnrichmentFile(bookId: string): Record<string, any> {
  const filePath = path.join(__dirname, "..", "..", "enrichment_data", `${bookId}.json`);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }
  return {};
}

function writeEnrichmentFile(bookId: string, data: Record<string, any>): void {
  const filePath = path.join(__dirname, "..", "..", "enrichment_data", `${bookId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ Synced evidence sources to ${filePath}`);
}

async function syncEvidenceForBook(bookId: string, workId: string | null): Promise<void> {
  if (!workId) {
    console.log(`  ⚠️  Book ${bookId} has no work ID (not migrated yet), skipping evidence sync`);
    return;
  }

  const pack = await loadEvidencePack(workId);
  if (!pack) {
    console.log(`  ⚠️  No evidence pack found for work ${workId}`);
    return;
  }

  if (!pack.sources.length) {
    console.log(`  ⚠️  No evidence sources found for work ${workId}`);
    return;
  }

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
  console.log(`  ✅ Synced ${pack.sources.length} evidence sources for book ${bookId}`);
}

async function main() {
  console.log("🔄 Syncing evidence packs for all books...\n");

  // Get all books from database
  const allBooks = await db.select().from(books).execute();
  console.log(`📚 Found ${allBooks.length} books in database\n`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const book of allBooks) {
    try {
      console.log(`Processing: "${book.title}" (${book.id})...`);

      // Try to find work ID via editions table (for migrated books)
      const edition = await db
        .select({ workId: editions.workId })
        .from(editions)
        .where(eq(editions.legacyBookId, book.id))
        .limit(1)
        .execute();

      const workId = edition.length > 0 ? edition[0].workId : null;

      if (workId) {
        await syncEvidenceForBook(book.id, workId);
        synced++;
      } else {
        console.log(`  ⚠️  No work found for book ${book.id}, skipping`);
        skipped++;
      }
    } catch (error: any) {
      console.error(`  ❌ Error processing book ${book.id}:`, error.message);
      errors++;
    }
  }

  console.log(`\n✅ Sync complete:`);
  console.log(`   - Synced: ${synced}`);
  console.log(`   - Skipped: ${skipped}`);
  console.log(`   - Errors: ${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

