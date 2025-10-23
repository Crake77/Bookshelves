#!/usr/bin/env node
/**
 * Migration: Add OLID columns to books table
 * 
 * Adds:
 * - openlibrary_edition_olid: TEXT (e.g., "OL24514166M")
 * - cover_olid: TEXT (stores OLID for rate-limit-free cover access)
 * 
 * These columns enable unlimited cover URL generation:
 * https://covers.openlibrary.org/b/olid/{cover_olid}-L.jpg
 * 
 * See: LEGAL_DATA_STRATEGY.md for rationale
 */

import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🔧 Adding OLID columns to books table...\n');
  
  try {
    // Check if columns already exist
    const checkColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'books' 
      AND column_name IN ('openlibrary_edition_olid', 'cover_olid')
    `;
    
    if (checkColumns.length === 2) {
      console.log('✅ Columns already exist, nothing to do');
      return;
    }
    
    // Add columns
    await sql`
      ALTER TABLE books 
      ADD COLUMN IF NOT EXISTS openlibrary_edition_olid TEXT,
      ADD COLUMN IF NOT EXISTS cover_olid TEXT
    `;
    
    console.log('✅ Added openlibrary_edition_olid column');
    console.log('✅ Added cover_olid column');
    
    // Add indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_books_olid 
      ON books(openlibrary_edition_olid)
    `;
    
    console.log('✅ Created index on openlibrary_edition_olid');
    
    console.log('\n📊 Migration complete!');
    console.log('   Next: Run update-batch-001-olids.js to populate data');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

migrate().catch(console.error);
