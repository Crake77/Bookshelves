import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('✅ Connected to database\n');

  try {
    // Test the exact query that fetchPopular uses (no genre filter)
    console.log('📊 Testing browse query (popular, no filters)...\n');
    
    const query = `
      SELECT
        b.id,
        b.google_books_id,
        b.title,
        b.authors,
        b.description,
        b.cover_url,
        b.published_date,
        b.page_count,
        b.categories,
        b.isbn,
        COALESCE(bs.total_ratings, 0) AS total_ratings,
        COALESCE(bs.average_rating, 0) AS average_rating
      FROM books b
      LEFT JOIN book_stats bs ON bs.book_id = b.id
      WHERE 1=1
      ORDER BY
        COALESCE(bs.total_ratings, 0) DESC,
        COALESCE(bs.average_rating, 0) DESC,
        b.title ASC
      LIMIT 20
      OFFSET 0
    `;

    const result = await client.query(query);
    
    console.log(`✅ Query returned ${result.rows.length} books:\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ NO BOOKS RETURNED! This is the problem.\n');
      console.log('Checking if books exist...\n');
      
      const countResult = await client.query('SELECT COUNT(*) FROM books');
      console.log(`Total books in database: ${countResult.rows[0].count}`);
      
      if (parseInt(countResult.rows[0].count) > 0) {
        console.log('\n⚠️  Books exist but query returned nothing!');
        console.log('Checking book_stats...\n');
        
        const statsResult = await client.query(`
          SELECT COUNT(*) as total,
                 COUNT(bs.book_id) as with_stats
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
        `);
        
        console.log(`Books with stats: ${statsResult.rows[0].with_stats}`);
        console.log(`Books without stats: ${parseInt(statsResult.rows[0].total) - parseInt(statsResult.rows[0].with_stats)}`);
      }
    } else {
      result.rows.forEach((book, i) => {
        console.log(`${i + 1}. ${book.title}`);
        console.log(`   ID: ${book.id}`);
        console.log(`   Ratings: ${book.total_ratings}, Avg: ${book.average_rating}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.end();
  }
}

main();

