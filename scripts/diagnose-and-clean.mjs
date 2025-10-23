import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database');

  try {
    // 1. Check what's in user_books
    console.log('\n=== USER_BOOKS STATUS ===');
    const userBooksCount = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM user_books
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('Books by status:', userBooksCount.rows);

    // 2. Check for orphaned user_books (books that don't exist)
    console.log('\n=== CHECKING FOR ORPHANED REFERENCES ===');
    const orphaned = await client.query(`
      SELECT ub.id, ub.book_id, ub.status
      FROM user_books ub
      LEFT JOIN books b ON b.id = ub.book_id
      WHERE b.id IS NULL
    `);
    console.log(`Found ${orphaned.rows.length} orphaned user_book entries`);
    if (orphaned.rows.length > 0) {
      console.log('Sample:', orphaned.rows.slice(0, 5));
    }

    // 3. Check books table
    console.log('\n=== BOOKS TABLE STATUS ===');
    const booksInfo = await client.query(`
      SELECT COUNT(*) as total FROM books
    `);
    console.log(`Total books in database: ${booksInfo.rows[0].total}`);

    // 4. Check book_stats
    console.log('\n=== BOOK_STATS STATUS ===');
    const statsInfo = await client.query(`
      SELECT COUNT(*) as total FROM book_stats
    `);
    console.log(`Total book_stats entries: ${statsInfo.rows[0].total}`);

    // 5. Sample some books to see what we have
    console.log('\n=== SAMPLE BOOKS (First 10) ===');
    const sampleBooks = await client.query(`
      SELECT 
        b.id,
        b.google_books_id,
        b.title,
        b.authors,
        bs.average_rating,
        bs.total_ratings
      FROM books b
      LEFT JOIN book_stats bs ON bs.book_id = b.id
      ORDER BY b.title
      LIMIT 10
    `);
    sampleBooks.rows.forEach(book => {
      console.log(`- ${book.title} by ${book.authors?.join(', ') || 'Unknown'} (ID: ${book.google_books_id?.substring(0, 15)}...)`);
    });

    // 6. Clean up decision
    console.log('\n=== CLEANUP OPTIONS ===');
    console.log('To clean orphaned user_books:');
    console.log('  node scripts/diagnose-and-clean.mjs --clean-orphaned');
    console.log('\nTo remove ALL user_books:');
    console.log('  node scripts/diagnose-and-clean.mjs --clean-all-shelves');
    console.log('\nTo reset books catalog (keep user books):');
    console.log('  node scripts/diagnose-and-clean.mjs --reset-catalog');

    // Execute cleanup if requested
    if (process.argv.includes('--clean-orphaned') && orphaned.rows.length > 0) {
      console.log('\n=== CLEANING ORPHANED USER_BOOKS ===');
      const deleteResult = await client.query(`
        DELETE FROM user_books ub
        WHERE NOT EXISTS (
          SELECT 1 FROM books b WHERE b.id = ub.book_id
        )
      `);
      console.log(`Deleted ${deleteResult.rowCount} orphaned user_book entries`);
    }

    if (process.argv.includes('--clean-all-shelves')) {
      console.log('\n=== REMOVING ALL USER_BOOKS ===');
      const deleteResult = await client.query(`DELETE FROM user_books`);
      console.log(`Deleted ${deleteResult.rowCount} user_book entries`);
    }

    if (process.argv.includes('--reset-catalog')) {
      console.log('\n=== RESETTING CATALOG (keeping user_books references valid) ===');
      
      // Don't delete books that users have on shelves
      const deleteStats = await client.query(`
        DELETE FROM book_stats bs
        WHERE NOT EXISTS (
          SELECT 1 FROM user_books ub WHERE ub.book_id = bs.book_id
        )
      `);
      console.log(`Deleted ${deleteStats.rowCount} book_stats entries`);
      
      const deleteBooks = await client.query(`
        DELETE FROM books b
        WHERE NOT EXISTS (
          SELECT 1 FROM user_books ub WHERE ub.book_id = b.id
        )
      `);
      console.log(`Deleted ${deleteBooks.rowCount} books not on any shelf`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
