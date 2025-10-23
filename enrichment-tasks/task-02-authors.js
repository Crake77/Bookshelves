// Task 2: Validate Authors
// Usage: node task-02-authors.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

async function validateAuthors(bookId) {
  console.log(`👤 Task 2: Validating authors for book ${bookId}...`);
  
  // Load book batch data
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Current authors: ${JSON.stringify(book.authors)}`);
  
  const result = {
    book_id: bookId,
    authors: {
      original: book.authors,
      validated: [],
      status: 'valid',
      notes: []
    },
    timestamp: new Date().toISOString()
  };
  
  // Validate authors array
  if (!book.authors || book.authors.length === 0) {
    result.authors.status = 'MISSING';
    result.authors.notes.push('CRITICAL: No authors found - this is REQUIRED');
    console.log('  ❌ MISSING AUTHORS - CRITICAL ISSUE');
  } else {
    result.authors.validated = book.authors.filter(a => a && a.trim().length > 0);
    
    if (result.authors.validated.length === 0) {
      result.authors.status = 'INVALID';
      result.authors.notes.push('CRITICAL: Authors array empty or invalid');
      console.log('  ❌ INVALID AUTHORS - CRITICAL ISSUE');
    } else {
      result.authors.status = 'valid';
      console.log(`  ✅ ${result.authors.validated.length} valid author(s)`);
      result.authors.validated.forEach(author => {
        console.log(`     - ${author}`);
      });
    }
  }
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  enrichmentData.authors = result.authors;
  enrichmentData.last_updated = result.timestamp;
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

// Run if called directly
const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-02-authors.js <book_id>');
  process.exit(1);
}

validateAuthors(bookId).catch(console.error);
