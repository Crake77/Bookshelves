import pg from 'pg';
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
await client.connect();
const result = await client.query(`
  SELECT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND (tablename LIKE '%genre%' OR tablename LIKE '%domain%' OR tablename LIKE '%supergenre%')
  ORDER BY tablename
`);
console.log(result.rows.map(x => x.tablename).join('\n'));
await client.end();
