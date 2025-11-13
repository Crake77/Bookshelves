#!/usr/bin/env node
/**
 * Get all book IDs from database
 * Usage: node scripts/get-all-book-ids.mjs
 */

import 'dotenv/config';
import { db } from '../db/index.ts';
import { books } from '@shared/schema';

async function main() {
  const allBooks = await db.select().from(books).execute();
  const bookIds = allBooks.map(b => b.id);
  console.log(JSON.stringify(bookIds));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });

