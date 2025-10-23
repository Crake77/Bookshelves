#!/usr/bin/env node
/**
 * Update Batch 001 books with OLID data from enrichment files
 * 
 * Reads enrichment_data/*.json files and populates:
 * - openlibrary_edition_olid
 * - cover_olid
 * - cover_url (updates to OLID-based URL if available)
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);
const ENRICHMENT_DIR = 'enrichment_data';

async function updateBatchOLIDs() {
  console.log('🔄 Updating Batch 001 books with OLID data...\n');
  
  // Read BATCH_MANIFEST.json to get batch 001 book IDs
  const manifest = JSON.parse(fs.readFileSync('BATCH_MANIFEST.json', 'utf8'));
  const batch001 = manifest.batches.find(b => b.batch_id === 'batch-001');
  
  if (!batch001) {
    console.error('❌ Batch 001 not found in manifest');
    return;
  }
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const bookInfo of batch001.books) {
    const bookId = bookInfo.id;
    const enrichmentFile = path.join(ENRICHMENT_DIR, `${bookId}.json`);
    
    if (!fs.existsSync(enrichmentFile)) {
      console.log(`⚠️  ${bookInfo.title} - No enrichment file found`);
      skippedCount++;
      continue;
    }
    
    const enrichmentData = JSON.parse(fs.readFileSync(enrichmentFile, 'utf8'));
    const coverData = enrichmentData.cover_urls;
    
    if (!coverData) {
      console.log(`⚠️  ${bookInfo.title} - No cover data in enrichment file`);
      skippedCount++;
      continue;
    }
    
    const olid = coverData.openlibrary_olid;
    const coverUrl = coverData.recommended;
    const coverSource = coverData.source;
    
    if (olid) {
      // Update with OLID
      await sql`
        UPDATE books 
        SET openlibrary_edition_olid = ${olid},
            cover_olid = ${olid},
            cover_url = ${coverUrl}
        WHERE id = ${bookId}
      `;
      console.log(`✅ ${bookInfo.title}`);
      console.log(`   OLID: ${olid}`);
      console.log(`   Cover: ${coverSource} (rate-limit-free)`);
      updatedCount++;
    } else {
      // No OLID, just update cover URL
      await sql`
        UPDATE books 
        SET cover_url = ${coverUrl}
        WHERE id = ${bookId}
      `;
      console.log(`✅ ${bookInfo.title}`);
      console.log(`   Cover: ${coverSource} (no OLID available)`);
      updatedCount++;
    }
  }
  
  console.log('\n📊 Update Complete:');
  console.log(`   ✅ Updated: ${updatedCount} books`);
  console.log(`   ⏭️  Skipped: ${skippedCount} books`);
  console.log(`\n💡 Verify with: node check-book.js 033508ff-bb34-41d9-aef2-141f4ed8dc84`);
}

updateBatchOLIDs().catch(console.error);
