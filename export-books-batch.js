// export-books-batch.js
// Export a batch of books from Neon database for GPT metadata enrichment

import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function exportBooksBatch(limit = 10, offset = 0) {
  const batchNumber = Math.floor(offset / limit) + 1;
  
  console.log(`📚 Exporting batch ${batchNumber} (${limit} books, offset ${offset})...`);
  
  try {
    const books = await sql`
      SELECT 
        id,
        title,
        authors,
        isbn,
        published_date,
        page_count,
        description,
        google_books_id,
        cover_url,
        categories
      FROM books
      ORDER BY id
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const filename = `books_batch_${String(batchNumber).padStart(3, '0')}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(books, null, 2));
    
    console.log(`✅ Exported ${books.length} books to ${filename}`);
    console.log(`\nFirst book: ${books[0]?.title || 'N/A'}`);
    console.log(`Last book: ${books[books.length - 1]?.title || 'N/A'}`);
    
    return books;
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const limit = args[0] ? parseInt(args[0]) : 10;
const offset = args[1] ? parseInt(args[1]) : 0;

exportBooksBatch(limit, offset);
