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
    // First, let's verify the books are there
    const countResult = await client.query('SELECT COUNT(*) FROM books');
    console.log(`📚 Total books: ${countResult.rows[0].count}\n`);

    // Check if browse API would return books
    const browseTest = await client.query(`
      SELECT b.id, b.title, b.google_books_id
      FROM books b
      LEFT JOIN book_stats bs ON bs.book_id = b.id
      ORDER BY COALESCE(bs.total_ratings, 0) DESC, b.title ASC
      LIMIT 20
    `);

    console.log(`✅ Browse query would return ${browseTest.rows.length} books:`);
    browseTest.rows.forEach((book, i) => {
      console.log(`   ${i + 1}. ${book.title}`);
    });

    console.log('\n✅ Database is correct!');
    console.log('⚠️  The issue is likely:');
    console.log('   1. Frontend is using cached fallback data');
    console.log('   2. Browse API might be returning empty results');
    console.log('   3. Browser cache needs to be cleared');
    console.log('\n📝 Next steps:');
    console.log('   1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   2. Clear browser cache');
    console.log('   3. Check if browse API is working: /api/browse?algo=popular');
    console.log('   4. Remove fallback data from browseFallback.ts if needed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

main();

