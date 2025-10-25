import pg from 'pg';
import fs from 'fs';
import { config } from 'dotenv';

// Load .env file
config();

const sql = fs.readFileSync('db/migrations/001_evidence_pack_architecture.sql', 'utf8');

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connected to database');
  
  await client.query(sql);
  console.log('✅ Migration complete');
  
  await client.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}
