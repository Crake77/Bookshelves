import pg from 'pg';
import fs from 'fs/promises';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database');

  try {
    // Load batch 1 data
    const batch1Raw = await fs.readFile('books_batch_001.json', 'utf-8');
    const batch1 = JSON.parse(batch1Raw);
    
    console.log(`\n=== LOADING BATCH 1 (${batch1.length} books) ===\n`);

    for (const book of batch1) {
      console.log(`Processing: ${book.title}...`);
      
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

      // Create book_stats with reasonable defaults
      // Give each book a simulated rating based on its position in batch
      // (just for demo purposes - later we'd get real stats)
      const simulatedRating = 60 + Math.floor(Math.random() * 35); // 60-95
      const simulatedRatingsCount = Math.floor(Math.random() * 500) + 50; // 50-550

      await client.query(`
        INSERT INTO book_stats (
          book_id, average_rating, total_ratings, ranking, updated_at
        )
        VALUES ($1, $2, $3, NULL, now())
        ON CONFLICT (book_id)
        DO UPDATE SET
          average_rating = EXCLUDED.average_rating,
          total_ratings = EXCLUDED.total_ratings,
          updated_at = now()
      `, [bookId, simulatedRating, simulatedRatingsCount]);

      console.log(`  ✓ Loaded with stats (${simulatedRating}/100, ${simulatedRatingsCount} ratings)`);
    }

    console.log('\n=== BATCH 1 LOADED SUCCESSFULLY ===');
    
    // Show final stats
    const statsCheck = await client.query(`
      SELECT COUNT(*) as count FROM books
    `);
    const statsCheckStats = await client.query(`
      SELECT COUNT(*) as count FROM book_stats
    `);
    
    console.log(`\nTotal books: ${statsCheck.rows[0].count}`);
    console.log(`Total book_stats: ${statsCheckStats.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
