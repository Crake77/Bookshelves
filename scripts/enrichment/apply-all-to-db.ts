#!/usr/bin/env node
/**
 * Apply enrichment data to database for all books
 * 
 * Usage: npm run enrichment:apply-all [--dry-run]
 */

import 'dotenv/config';
import { db } from '../../db/index.js';
import { books } from '@shared/schema.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function applyEnrichmentForBook(bookId: string, dryRun: boolean = false): Promise<void> {
  const dryRunFlag = dryRun ? '--dry-run' : '';
  const command = `node --dns-result-order=ipv4first -r dotenv/config --import tsx scripts/enrichment/apply-to-db.ts ${dryRunFlag} ${bookId}`.trim();
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
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Applying enrichment data to database for all books...');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - no changes will be made to database\n');
  } else {
    console.log('');
  }

  const allBooks = await db.select().from(books).execute();
  console.log(`📚 Found ${allBooks.length} books in database\n`);

  let success = 0;
  let errors = 0;

  for (const book of allBooks) {
    try {
      console.log(`Processing: "${book.title}" (${book.id})...`);
      await applyEnrichmentForBook(book.id, dryRun);
      success++;
    } catch (error) {
      errors++;
    }
  }

  console.log(`\n✅ Enrichment application complete:`);
  console.log(`   - Success: ${success}`);
  console.log(`   - Errors: ${errors}`);
  if (dryRun) {
    console.log(`\n⚠️  This was a dry run - no changes were made to the database`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

