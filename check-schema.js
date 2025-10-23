import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const res = await client.query(`
  SELECT column_name, data_type, udt_name 
  FROM information_schema.columns 
  WHERE table_name = 'books' AND column_name = 'authors'
`);

console.log(JSON.stringify(res.rows, null, 2));

await client.end();
