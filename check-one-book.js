import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const bookId = '02901e6f-94d3-4104-9fd8-e609e75b6af0'; // Summer of Lovecraft

console.log('\n📖 Book: Summer of Lovecraft\n');

// Get book details
const book = await client.query(`
  SELECT id, title, authors, LEFT(description, 100) as desc_preview, cover_url
  FROM books 
  WHERE id = $1
`, [bookId]);

console.log('Book Data:');
console.log('- Authors:', book.rows[0].authors);
console.log('- Description preview:', book.rows[0].desc_preview);
console.log('- Cover URL:', book.rows[0].cover_url ? '✅ Present' : '❌ Missing');

// Get taxonomy
const domain = await client.query(`
  SELECT d.name 
  FROM book_domains bd
  JOIN domains d ON bd.domain_id = d.id
  WHERE bd.book_id = $1
`, [bookId]);

const genres = await client.query(`
  SELECT g.name 
  FROM book_genres bg
  JOIN genres g ON bg.genre_id = g.id
  WHERE bg.book_id = $1
`, [bookId]);

const crossTags = await client.query(`
  SELECT COUNT(*) 
  FROM book_cross_tags
  WHERE book_id = $1
`, [bookId]);

console.log('\nTaxonomy:');
console.log('- Domain:', domain.rows.length > 0 ? domain.rows[0].name : '❌ Missing');
console.log('- Genres:', genres.rows.length > 0 ? genres.rows.map(r => r.name).join(', ') : '❌ Missing');
console.log('- Cross-tags count:', crossTags.rows[0].count);

await client.end();
