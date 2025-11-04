import 'dotenv/config';
import { db } from '../db/index.js';
import { books } from '@shared/schema';
import { inArray } from 'drizzle-orm';
import fs from 'fs';

const batch002Ids = [
  '42b1a772-97a1-4777-97cb-ae30b66feab8', // The Eye of the World
  'a22d3173-56b0-4aaf-850e-d594a74741d3', // The Great Hunt
  '13e4fad3-10ac-4d50-92e8-96e52827dec3', // Ender's Game
  '6f3452c6-e8c5-4328-941d-4992b401e7fe', // Speaker for the Dead
  '60eab8a3-98c7-4f63-8b81-208dd9fc8d86', // Defiance of the Fall
  '661d7f73-dc36-4fd7-94c8-5fd6bba9bf16', // Ascendance of a Bookworm: Part 1 Volume 1
  'aafd33c5-f1ee-4da5-ae61-7df49eed6b0f', // Delve (Path of the Deathless)
  'f8486671-601d-4267-9347-8e859a7cc35a', // World of Cultivation
  '25722ee3-1244-4d3d-bf6b-6d1af5a0e8d1', // Tower of God Volume One
  'a5630692-6cf1-4d8c-b834-970b18fbabe5'  // Dune
];

async function main() {
  console.log(`\n📚 Exporting Batch 002 books from database...\n`);
  
  // Query all batch 002 books
  const batch002Books = await db.query.books.findMany({
    where: inArray(books.id, batch002Ids),
    columns: {
      id: true,
      title: true,
      authors: true,
      isbn: true,
      publishedDate: true,
      pageCount: true,
      description: true,
      googleBooksId: true,
      coverUrl: true,
      categories: true
    }
  });

  if (batch002Books.length !== batch002Ids.length) {
    const foundIds = batch002Books.map(b => b.id);
    const missingIds = batch002Ids.filter(id => !foundIds.includes(id));
    console.error(`⚠️  Warning: ${missingIds.length} book(s) not found in database:`);
    missingIds.forEach(id => console.error(`   - ${id}`));
  }

  // Transform to match books_batch_001.json format
  const exportData = batch002Books.map(book => ({
    id: book.id,
    title: book.title,
    authors: book.authors || [],
    isbn: book.isbn || null,
    published_date: book.publishedDate || null,
    page_count: book.pageCount || null,
    description: book.description || null,
    google_books_id: book.googleBooksId || null,
    cover_url: book.coverUrl || null,
    categories: book.categories || []
  }));

  // Write to JSON file
  const outputFile = 'books_batch_002.json';
  fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf8');

  console.log(`✅ Exported ${exportData.length} books to ${outputFile}\n`);
  console.log('Books exported:');
  exportData.forEach((book, i) => {
    console.log(`   ${i + 1}. ${book.title}`);
    console.log(`      ID: ${book.id}`);
    console.log(`      Authors: ${book.authors.join(', ') || 'None'}`);
    console.log(`      Description: ${book.description ? `${book.description.length} chars` : 'Missing'}`);
    console.log('');
  });

  console.log(`\n📝 Next step: Run 'node enrich-batch.js' (after updating it to use books_batch_002.json)\n`);
}

main().catch(console.error);

