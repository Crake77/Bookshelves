#!/usr/bin/env node

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigrations() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    console.log('🗄️  Starting database migrations...');
    
    // Read and run the pgvector migration
    const pgvectorSQL = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '0001_enable_pgvector.sql'), 'utf8');
    console.log('📦 Enabling pgvector extension...');
    await pool.query(pgvectorSQL);
    console.log('✅ pgvector extension enabled');
    
    // Read and run the taxonomy migration  
    const taxonomySQL = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '0002_taxonomy_schema_v2.sql'), 'utf8');
    console.log('📊 Creating taxonomy tables...');
    await pool.query(taxonomySQL);
    console.log('✅ Taxonomy schema created');
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();