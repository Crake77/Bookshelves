#!/usr/bin/env node
/**
 * Batch Manifest Query Tool
 * 
 * Usage:
 *   node check-batch.js                    # List all batches
 *   node check-batch.js batch-001          # Show details for specific batch
 *   node check-batch.js --stats            # Show overall statistics
 */

import fs from 'fs';

const MANIFEST_FILE = 'BATCH_MANIFEST.json';

function loadManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error('❌ BATCH_MANIFEST.json not found');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
}

function listAllBatches(manifest) {
  console.log('\n📋 All Batches\n');
  console.log('Batch ID    | Status     | Books | OLID% | Date');
  console.log('------------|------------|-------|-------|------------');
  
  for (const batch of manifest.batches) {
    const status = batch.status === 'completed' ? '✅' : '🔄';
    const olidRate = batch.statistics?.olid_capture_rate || 'N/A';
    console.log(
      `${batch.batch_id.padEnd(11)} | ${status} ${batch.status.padEnd(8)} | ${String(batch.book_count).padStart(5)} | ${olidRate.padStart(5)} | ${batch.date_completed || batch.date_started}`
    );
  }
  
  console.log('\n📊 Overall Statistics:');
  console.log(`   Total Batches: ${manifest.metadata.total_batches}`);
  console.log(`   Total Books: ${manifest.metadata.total_books_enriched}`);
  console.log(`   Next Batch: ${manifest.metadata.next_batch_id}`);
  console.log();
}

function showBatchDetails(manifest, batchId) {
  const batch = manifest.batches.find(b => b.batch_id === batchId);
  
  if (!batch) {
    console.error(`❌ Batch ${batchId} not found`);
    process.exit(1);
  }
  
  console.log(`\n📦 Batch: ${batch.batch_id}`);
  console.log(`Status: ${batch.status === 'completed' ? '✅ Completed' : '🔄 ' + batch.status}`);
  console.log(`Date: ${batch.date_started} → ${batch.date_completed || 'in progress'}`);
  console.log(`Books: ${batch.book_count}`);
  
  console.log('\n📚 Books in this batch:\n');
  console.log('ID (first 8) | Title                                    | OLID          | Cover Source');
  console.log('-------------|------------------------------------------|---------------|------------------');
  
  for (const book of batch.books) {
    const idShort = book.id.substring(0, 8);
    const titleTrunc = book.title.length > 40 ? book.title.substring(0, 37) + '...' : book.title.padEnd(40);
    const olidDisplay = book.has_olid ? book.olid : 'none';
    const coverSource = book.cover_source;
    
    console.log(`${idShort} | ${titleTrunc} | ${olidDisplay.padEnd(13)} | ${coverSource}`);
  }
  
  console.log('\n📊 Statistics:');
  if (batch.statistics) {
    for (const [key, value] of Object.entries(batch.statistics)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(`   ${label}: ${value}`);
    }
  }
  
  console.log('\n📁 Files:');
  if (batch.files) {
    for (const [type, path] of Object.entries(batch.files)) {
      console.log(`   ${type.padEnd(18)}: ${path}`);
    }
  }
  
  if (batch.notes && batch.notes.length > 0) {
    console.log('\n📝 Notes:');
    for (const note of batch.notes) {
      console.log(`   • ${note}`);
    }
  }
  
  console.log();
}

function showStats(manifest) {
  console.log('\n📊 Global Statistics\n');
  
  let totalBooks = 0;
  let totalWithOlid = 0;
  
  for (const batch of manifest.batches) {
    totalBooks += batch.book_count;
    if (batch.statistics?.books_with_olid) {
      totalWithOlid += batch.statistics.books_with_olid;
    }
  }
  
  const olidPercentage = totalBooks > 0 ? ((totalWithOlid / totalBooks) * 100).toFixed(1) : 0;
  
  console.log(`Total Batches: ${manifest.batches.length}`);
  console.log(`Total Books Enriched: ${totalBooks}`);
  console.log(`Books with OLID: ${totalWithOlid} (${olidPercentage}%)`);
  console.log(`Books without OLID: ${totalBooks - totalWithOlid}`);
  console.log(`\nLast Updated: ${manifest.metadata.last_updated}`);
  console.log(`Next Batch: ${manifest.metadata.next_batch_id}\n`);
}

// Main
const args = process.argv.slice(2);
const manifest = loadManifest();

if (args.length === 0) {
  listAllBatches(manifest);
} else if (args[0] === '--stats') {
  showStats(manifest);
} else {
  showBatchDetails(manifest, args[0]);
}
