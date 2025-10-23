import pg from 'pg';
import fs from 'fs/promises';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const batchFile = process.argv[2];
  
  if (!batchFile) {
    console.error('Usage: node scripts/load-batch.mjs <batch-file>');
    console.error('Example: node scripts/load-batch.mjs books_batch_002.json');
    process.exit(1);
  }

  await client.connect();
  console.log('Connected to database');

  try {
    // Load batch data
    const batchRaw = await fs.readFile(batchFile, 'utf-8');
    const batch = JSON.parse(batchRaw);
    
    console.log(`\n=== LOADING ${batchFile} (${batch.length} books) ===\n`);

    let loaded = 0;
    let updated = 0;

    for (const book of batch) {
      console.log(`Processing: ${book.title}...`);
      
      // Check if book already exists
      const existing = await client.query(`
        SELECT id FROM books WHERE google_books_id = $1
      `, [book.google_books_id]);

      const isUpdate = existing.rows.length > 0;

      // Insert or update book
      const bookResult = await client.query(`
        INSERT INTO books (
          google_books_id, title, authors, description, 
          cover_url, published_date, page_count, categories, isbn
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (google_books_id) 
        DO UPDATE SET
          title = EXCLUDED.title,
          authors = EXCLUDED.authors,
          description = EXCLUDED.description,
          cover_url = EXCLUDED.cover_url,
          published_date = EXCLUDED.published_date,
          page_count = EXCLUDED.page_count,
          categories = EXCLUDED.categories,
          isbn = EXCLUDED.isbn
        RETURNING id
      `, [
        book.google_books_id,
        book.title,
        book.authors,
        book.description,
        book.cover_url,
        book.published_date,
        book.page_count,
        book.categories,
        book.isbn
      ]);

      const bookId = bookResult.rows[0].id;

      // Create book_stats if it doesn't exist
      const existingStats = await client.query(`
        SELECT id FROM book_stats WHERE book_id = $1
      `, [bookId]);

      if (existingStats.rows.length === 0) {
        // New book - add stats
        const simulatedRating = 60 + Math.floor(Math.random() * 35); // 60-95
        const simulatedRatingsCount = Math.floor(Math.random() * 500) + 50; // 50-550

        await client.query(`
          INSERT INTO book_stats (
            book_id, average_rating, total_ratings, ranking, updated_at
          )
          VALUES ($1, $2, $3, NULL, now())
        `, [bookId, simulatedRating, simulatedRatingsCount]);

        console.log(`  ✓ ${isUpdate ? 'Updated' : 'Loaded'} with new stats (${simulatedRating}/100, ${simulatedRatingsCount} ratings)`);
        isUpdate ? updated++ : loaded++;
      } else {
        // Existing book with stats - just update book info
        console.log(`  ✓ Updated (keeping existing stats)`);
        updated++;
      }
    }

    console.log(`\n=== BATCH LOADED SUCCESSFULLY ===`);
    console.log(`New books loaded: ${loaded}`);
    console.log(`Existing books updated: ${updated}`);
    
    // Show final stats
    const statsCheck = await client.query(`
      SELECT COUNT(*) as count FROM books
    `);
    const statsCheckStats = await client.query(`
      SELECT COUNT(*) as count FROM book_stats
    `);
    
    console.log(`\nTotal books in database: ${statsCheck.rows[0].count}`);
    console.log(`Total book_stats in database: ${statsCheckStats.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
