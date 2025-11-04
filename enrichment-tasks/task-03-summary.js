// Task 3: Generate Original Summary
// Usage: node task-03-summary.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json
// NOTE: This requires manual intervention - AI must rewrite the summary

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

async function generateSummary(bookId) {
  console.log(`📝 Task 3: Summary generation for book ${bookId}...`);
  
  // Load book from appropriate batch file
  const { loadBookFromBatch } = await import('./helpers.js');
  const book = loadBookFromBatch(bookId);
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Existing description length: ${book.description ? book.description.length : 0} chars`);
  
  const result = {
    book_id: bookId,
    summary: {
      original_description: book.description,
      original_length: book.description ? book.description.length : 0,
      new_summary: null,
      new_length: 0,
      word_count: 0,
      status: 'pending',
      notes: []
    },
    timestamp: new Date().toISOString()
  };
  
  // Check if summary needs to be written
  if (!book.description || book.description.length < 50) {
    result.summary.status = 'needs_generation';
    result.summary.notes.push('No existing description - must generate from scratch');
    console.log('  ⚠️  No description available - needs manual generation');
  } else {
    result.summary.status = 'needs_rewrite';
    result.summary.notes.push('Existing description found - must be rewritten in own words (150-300 words)');
    console.log('  ⚠️  Description exists - MUST be completely rewritten');
    console.log(`  📖 Original excerpt: "${book.description.substring(0, 100)}..."`);
  }
  
  // This task marks the summary as needing work
  // Actual summary writing must be done by AI/human in a separate step
  result.summary.notes.push('MANUAL STEP: AI must write original 150-300 word summary');
  result.summary.notes.push('Requirements: No spoilers, no marketing language, no copied phrases >3-4 words');
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  enrichmentData.summary = result.summary;
  enrichmentData.last_updated = result.timestamp;
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  console.log(`  ⏸️  Status: ${result.summary.status} - requires manual AI summary writing`);
  
  return result;
}

// Run if called directly
const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-03-summary.js <book_id>');
  process.exit(1);
}

generateSummary(bookId).catch(console.error);
