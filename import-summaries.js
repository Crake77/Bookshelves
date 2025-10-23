// Import Rewritten Summaries
// Parses SUMMARY_REWRITE_WORKSHEET.md and updates enrichment JSON files
// Then regenerates SQL for affected books

import fs from 'fs';
import { execSync } from 'child_process';

const WORKSHEET_FILE = 'SUMMARY_REWRITE_WORKSHEET.md';
const ENRICHMENT_DIR = 'enrichment_data';

if (!fs.existsSync(WORKSHEET_FILE)) {
  console.error(`❌ ${WORKSHEET_FILE} not found. Run generate-summary-worksheet.js first.`);
  process.exit(1);
}

const worksheet = fs.readFileSync(WORKSHEET_FILE, 'utf8');

// Parse worksheet to extract book IDs and new summaries
const bookPattern = /\*\*Book ID:\*\* `([^`]+)`[\s\S]*?### NEW SUMMARY \(150-300 words\)\s*\n+([\s\S]*?)(?=\n\n\n---|$)/g;

let match;
let updated = 0;
let skipped = 0;

while ((match = bookPattern.exec(worksheet)) !== null) {
  const bookId = match[1];
  const newSummary = match[2].trim();
  
  if (!newSummary || newSummary.length < 10) {
    console.log(`⏭️  Skipping ${bookId} - no summary written yet`);
    skipped++;
    continue;
  }
  
  // Count words
  const wordCount = newSummary.split(/\s+/).length;
  
  if (wordCount < 150 || wordCount > 300) {
    console.log(`⚠️  WARNING: ${bookId} - ${wordCount} words (should be 150-300)`);
  }
  
  // Load enrichment data
  const enrichmentPath = `${ENRICHMENT_DIR}/${bookId}.json`;
  if (!fs.existsSync(enrichmentPath)) {
    console.error(`❌ Enrichment file not found: ${enrichmentPath}`);
    continue;
  }
  
  const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, 'utf8'));
  
  // Update summary
  enrichment.summary.new_summary = newSummary;
  enrichment.summary.new_length = newSummary.length;
  enrichment.summary.word_count = wordCount;
  enrichment.summary.status = 'completed';
  enrichment.summary.notes.push(`Summary imported on ${new Date().toISOString()}`);
  enrichment.last_updated = new Date().toISOString();
  
  // Save updated enrichment
  fs.writeFileSync(enrichmentPath, JSON.stringify(enrichment, null, 2));
  
  console.log(`✅ ${bookId} - ${wordCount} words imported`);
  updated++;
  
  // Regenerate SQL
  try {
    execSync(`node enrichment-tasks/task-08-generate-sql.js "${bookId}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Failed to regenerate SQL for ${bookId}`);
  }
}

console.log(`\n📊 Summary Import Complete:`);
console.log(`   ✅ Updated: ${updated}`);
console.log(`   ⏭️  Skipped: ${skipped}`);

if (skipped > 0) {
  console.log(`\n💡 Tip: ${skipped} books still need summaries written in ${WORKSHEET_FILE}`);
}
