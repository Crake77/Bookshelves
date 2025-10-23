// Task 1: Fetch Cover URLs
// Usage: node task-01-cover-urls.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

async function fetchCoverURLs(bookId) {
  console.log(`📸 Task 1: Fetching cover URLs for book ${bookId}...`);
  
  // Ensure enrichment directory exists
  if (!fs.existsSync(ENRICHMENT_DIR)) {
    fs.mkdirSync(ENRICHMENT_DIR);
  }
  
  // Load book batch data
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Current cover_url: ${book.cover_url || 'NULL'}`);
  
  const result = {
    book_id: bookId,
    title: book.title,
    cover_urls: {
      existing: book.cover_url,
      google_books: null,
      openlibrary: null,
      recommended: null,
      source: null
    },
    timestamp: new Date().toISOString()
  };
  
  // Try Google Books first
  if (book.google_books_id && book.google_books_id !== 'demo-book-6') {
    const gbUrl = `https://books.google.com/books/content?id=${book.google_books_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
    result.cover_urls.google_books = gbUrl;
    console.log(`  ✅ Google Books URL: ${gbUrl}`);
  }
  
  // Try OpenLibrary by ISBN
  if (book.isbn) {
    const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
    result.cover_urls.openlibrary = olUrl;
    console.log(`  ✅ OpenLibrary URL: ${olUrl}`);
  }
  
  // Determine recommended URL
  if (result.cover_urls.google_books) {
    result.cover_urls.recommended = result.cover_urls.google_books;
    result.cover_urls.source = 'google_books';
  } else if (result.cover_urls.openlibrary) {
    result.cover_urls.recommended = result.cover_urls.openlibrary;
    result.cover_urls.source = 'openlibrary';
  } else if (book.cover_url) {
    result.cover_urls.recommended = book.cover_url;
    result.cover_urls.source = 'existing';
  }
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  enrichmentData.cover_urls = result.cover_urls;
  enrichmentData.last_updated = result.timestamp;
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  console.log(`  ✅ Recommended: ${result.cover_urls.recommended || 'NONE'}`);
  
  return result;
}

// Run if called directly
const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-01-cover-urls.js <book_id>');
  process.exit(1);
}

fetchCoverURLs(bookId).catch(console.error);
