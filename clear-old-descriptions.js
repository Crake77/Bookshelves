import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

// Batch 001 book IDs (the only ones we want to keep enriched)
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

console.log('\n🧹 Clearing old descriptions...\n');

// Count books with descriptions that aren't in batch 001
const count = await client.query(`
  SELECT COUNT(*) 
  FROM books 
  WHERE description IS NOT NULL 
    AND description != ''
    AND id != ALL($1)
`, [batch001Ids]);

console.log(`📊 Found ${count.rows[0].count} books with old descriptions to clear`);

// Clear descriptions from all books except batch 001
await client.query('BEGIN');

const result = await client.query(`
  UPDATE books 
  SET description = NULL
  WHERE description IS NOT NULL 
    AND description != ''
    AND id != ALL($1)
  RETURNING id, title
`, [batch001Ids]);

await client.query('COMMIT');

console.log(`✅ Cleared descriptions from ${result.rowCount} books\n`);

// Verify final state
const final = await client.query(`
  SELECT COUNT(*) 
  FROM books 
  WHERE description IS NOT NULL 
    AND description != ''
`);

console.log(`📚 Final state: ${final.rows[0].count} books with descriptions (should be 10)`);

// List the 10 enriched books
const enriched = await client.query(`
  SELECT title
  FROM books 
  WHERE id = ANY($1)
  ORDER BY title
`, [batch001Ids]);

console.log('\n✅ Batch 001 enriched books (kept):');
enriched.rows.forEach((book, i) => {
  console.log(`${i+1}. ${book.title}`);
});

await client.end();
