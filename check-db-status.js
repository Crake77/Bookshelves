import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

// Get total book count
const total = await client.query('SELECT COUNT(*) FROM books');
console.log(`\n📚 Total books in database: ${total.rows[0].count}`);

// Get enriched books (with descriptions)
const enriched = await client.query(`
  SELECT COUNT(*) 
  FROM books 
  WHERE description IS NOT NULL 
    AND description != ''
    AND LENGTH(description) > 100
`);
console.log(`✅ Books with enriched descriptions: ${enriched.rows[0].count}`);

// Get books with taxonomy
const withTaxonomy = await client.query(`
  SELECT COUNT(DISTINCT book_id) 
  FROM book_domains
`);
console.log(`🏷️  Books with domain classification: ${withTaxonomy.rows[0].count}`);

// List batch 001 books
console.log('\n📖 Batch 001 Books:');
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

const batch001 = await client.query(`
  SELECT id, title, 
         CASE WHEN description IS NOT NULL AND LENGTH(description) > 100 THEN '✅' ELSE '❌' END as has_desc,
         CASE WHEN EXISTS (SELECT 1 FROM book_domains WHERE book_id = books.id) THEN '✅' ELSE '❌' END as has_tax
  FROM books 
  WHERE id = ANY($1)
  ORDER BY title
`, [batch001Ids]);

batch001.rows.forEach((book, i) => {
  console.log(`${i+1}. ${book.has_desc} ${book.has_tax} ${book.title.substring(0, 50)}...`);
});

// Check for other enriched books
const others = await client.query(`
  SELECT id, title
  FROM books 
  WHERE description IS NOT NULL 
    AND LENGTH(description) > 100
    AND id != ALL($1)
  LIMIT 5
`, [batch001Ids]);

if (others.rows.length > 0) {
  console.log(`\n⚠️  Warning: ${others.rows.length} other books have descriptions (should be 0):`);
  others.rows.forEach(book => {
    console.log(`   - ${book.title.substring(0, 50)}... (${book.id})`);
  });
}

await client.end();
