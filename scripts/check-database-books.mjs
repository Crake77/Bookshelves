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
    // Count total books
    const countResult = await client.query('SELECT COUNT(*) FROM books');
    console.log(`📚 Total books in database: ${countResult.rows[0].count}\n`);

    // List all books with their IDs
    const booksResult = await client.query(`
      SELECT id, title, google_books_id, authors
      FROM books
      ORDER BY title
    `);

    console.log('📖 All books in database:');
    console.log('='.repeat(80));
    booksResult.rows.forEach((book, i) => {
      console.log(`${i + 1}. ${book.title}`);
      console.log(`   ID: ${book.id}`);
      console.log(`   Google Books ID: ${book.google_books_id || 'N/A'}`);
      console.log(`   Authors: ${Array.isArray(book.authors) ? book.authors.join(', ') : 'N/A'}`);
      console.log('');
    });

    // Check for batch 001 books
    const batch001Ids = [
      '00df7f2a-9ba5-4835-a09a-2b87c50c81ec',
      '02901e6f-94d3-4104-9fd8-e609e75b6af0',
      '02bd1dc8-22dd-4727-b837-ea1096cc97d6',
      '03082e3d-3058-471b-a901-2956c1856f1e',
      '033508ff-bb34-41d9-aef2-141f4ed8dc84',
      '04537132-0262-4928-90cc-3b1abdbf04c4',
      '0482d088-1b9f-44c1-93d3-0678504c6e1b',
      '04b43824-68d4-4ccb-bc3e-48570d9de19a',
      '05eaef7d-9e38-4e02-8fec-358dd2b16ed8',
      '068a9286-750d-489b-8d68-b56825151747'
    ];

    const batch001Result = await client.query(`
      SELECT id, title FROM books WHERE id = ANY($1)
    `, [batch001Ids]);

    console.log(`\n✅ Batch 001 books found: ${batch001Result.rows.length}/10`);

    // Check for batch 002 books (from books_batch_002.json)
    const batch002Ids = [
      '42b1a772-97a1-4777-97cb-ae30b66feab8', // Eye of the World
      'a22d3173-56b0-4aaf-850e-d594a74741d3', // Great Hunt
      '13e4fad3-10ac-4d50-92e8-96e52827dec3', // Ender's Game
      '25722ee3-1244-4d3d-bf6b-6d1af5a0e8d1', // Speaker for the Dead
      '60eab8a3-98c7-4f63-8b81-208dd9fc8d86', // Defiance of the Fall
      '661d7f73-dc36-4fd7-94c8-5fd6bba9bf16', // Ascendance of Bookworm
      '6f3452c6-e8c5-4328-941d-4992b401e7fe', // Tower of God
      'a5630692-6cf1-4d8c-b834-970b18fbabe5', // Dune
      'aafd33c5-f1ee-4da5-ae61-7df49eed6b0f', // Path of the Deathless
      'f8486671-601d-4267-9347-8e859a7cc35a'  // World of Cultivation
    ];

    const batch002Result = await client.query(`
      SELECT id, title FROM books WHERE id = ANY($1)
    `, [batch002Ids]);

    console.log(`\n✅ Batch 002 books found: ${batch002Result.rows.length}/10`);
    if (batch002Result.rows.length > 0) {
      console.log('   Found:');
      batch002Result.rows.forEach(book => {
        console.log(`   - ${book.title}`);
      });
    }

    // Check for old books (Legends and Lattes, Red Rising, etc.)
    const oldBooksResult = await client.query(`
      SELECT id, title, google_books_id
      FROM books
      WHERE title ILIKE '%Legends and Lattes%'
         OR title ILIKE '%Red Rising%'
         OR google_books_id IN ('legends-and-lattes', 'red-rising')
    `);

    if (oldBooksResult.rows.length > 0) {
      console.log(`\n⚠️  Old books found in database (should be deleted):`);
      oldBooksResult.rows.forEach(book => {
        console.log(`   - ${book.title} (ID: ${book.id}, GBID: ${book.google_books_id})`);
      });
    } else {
      console.log(`\n✅ No old books found in database`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

main();

