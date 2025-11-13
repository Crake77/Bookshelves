#!/usr/bin/env node
/**
 * Collect external metadata (including Google Books/OpenLibrary descriptions) for all books
 * 
 * Usage: npm run metadata:collect-all
 */

import 'dotenv/config';
import { db } from '../../db/index.js';
import { books } from '@shared/schema';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function collectMetadataForBook(bookId: string): Promise<void> {
  const command = `node --dns-result-order=ipv4first --import tsx scripts/enrichment/collect-metadata.ts ${bookId}`;
  try {
    const { stdout, stderr } = await execAsync(command, { env: process.env });
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  } catch (error: any) {
    console.error(`  ❌ Failed for ${bookId}: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🔄 Collecting external metadata for all books...\n');

  const allBooks = await db.select().from(books).execute();
  console.log(`📚 Found ${allBooks.length} books in database\n`);

  let success = 0;
  let errors = 0;

  for (const book of allBooks) {
    try {
      console.log(`Processing: "${book.title}" (${book.id})...`);
      await collectMetadataForBook(book.id);
      success++;
    } catch (error) {
      errors++;
    }
  }

  console.log(`\n✅ Metadata collection complete:`);
  console.log(`   - Success: ${success}`);
  console.log(`   - Errors: ${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

