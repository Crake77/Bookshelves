import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
const result = await client.query(`
  SELECT title, categories, description 
  FROM books 
  WHERE google_books_id = 'dba8BwAAQBAJ'
`);
console.log(JSON.stringify(result.rows, null, 2));
await client.end();
