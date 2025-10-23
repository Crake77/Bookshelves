import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const slugs = ['novella', 'space', 'complex', 'experimental', 'literary', 'sophisticated', 'philosophical', 'space-opera'];

for (const slug of slugs) {
  const r = await client.query('SELECT slug, name FROM cross_tags WHERE slug = $1', [slug]);
  console.log(`${slug}: ${r.rows.length > 0 ? '✅ ' + r.rows[0].name : '❌ NOT FOUND'}`);
}

await client.end();
