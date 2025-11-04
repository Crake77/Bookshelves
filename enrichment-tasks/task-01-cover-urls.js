// Task 1: Fetch Cover URLs & Open Library ID (OLID)
// Usage: node task-01-cover-urls.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json
//
// Priority: Fetch OLID/CoverID from Open Library (no rate limits)
// Fallback: Google Books API
// See: LEGAL_DATA_STRATEGY.md for cover sourcing best practices

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

/**
 * Fetch OLID from Open Library API by ISBN or title/author
 */
async function fetchOpenLibraryOLID(book) {
  try {
    // Try ISBN lookup first (most reliable)
    if (book.isbn) {
      const isbnClean = book.isbn.replace(/[^0-9X]/gi, '');
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnClean}&format=json&jscmd=data`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const bookData = data[`ISBN:${isbnClean}`];
        if (bookData?.key) {
          const olid = bookData.key.replace('/books/', '');
          const coverI = bookData.cover?.large?.match(/\/id\/(\d+)/)?.[1];
          return { olid, cover_id: coverI || null };
        }
      }
    }
    
    // Fallback: Title + author search
    if (book.title && book.authors?.[0]) {
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.authors[0])}&limit=1`;
      const response = await fetch(searchUrl);
      if (response.ok) {
        const data = await response.json();
        const doc = data.docs?.[0];
        if (doc) {
          const olid = doc.lending_edition_s || doc.edition_key?.[0];
          const coverI = doc.cover_i;
          return { olid: olid || null, cover_id: coverI || null };
        }
      }
    }
    
    return { olid: null, cover_id: null };
  } catch (error) {
    console.warn(`  ⚠️  Open Library API error: ${error.message}`);
    return { olid: null, cover_id: null };
  }
}

async function fetchCoverURLs(bookId) {
  console.log(`📸 Task 1: Fetching cover URLs & OLID for book ${bookId}...`);
  
  // Ensure enrichment directory exists
  if (!fs.existsSync(ENRICHMENT_DIR)) {
    fs.mkdirSync(ENRICHMENT_DIR);
  }
  
  // Load book from appropriate batch file
  const { loadBookFromBatch } = await import('./helpers.js');
  const book = loadBookFromBatch(bookId);
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Current cover_url: ${book.cover_url || 'NULL'}`);
  
  const result = {
    book_id: bookId,
    title: book.title,
    cover_urls: {
      existing: book.cover_url,
      google_books: null,
      openlibrary: null,
      openlibrary_olid: null,
      cover_id: null,
      recommended: null,
      source: null
    },
    timestamp: new Date().toISOString()
  };
  
  // Fetch Open Library OLID (priority for rate-limit-free access)
  console.log(`  🔍 Fetching Open Library OLID...`);
  const { olid, cover_id } = await fetchOpenLibraryOLID(book);
  if (olid) {
    result.cover_urls.openlibrary_olid = olid;
    console.log(`  ✅ Open Library OLID: ${olid}`);
  }
  if (cover_id) {
    result.cover_urls.cover_id = cover_id;
    console.log(`  ✅ Cover ID: ${cover_id}`);
  }
  
  // Try Google Books first
  if (book.google_books_id && book.google_books_id !== 'demo-book-6') {
    const gbUrl = `https://books.google.com/books/content?id=${book.google_books_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
    result.cover_urls.google_books = gbUrl;
    console.log(`  ✅ Google Books URL: ${gbUrl}`);
  }
  
  // Generate Open Library cover URLs from OLID/CoverID (no rate limits)
  if (olid) {
    const olidUrl = `https://covers.openlibrary.org/b/olid/${olid}-L.jpg`;
    result.cover_urls.openlibrary = olidUrl;
    console.log(`  ✅ OpenLibrary OLID URL: ${olidUrl}`);
  } else if (cover_id) {
    const coverIdUrl = `https://covers.openlibrary.org/b/id/${cover_id}-L.jpg`;
    result.cover_urls.openlibrary = coverIdUrl;
    console.log(`  ✅ OpenLibrary CoverID URL: ${coverIdUrl}`);
  } else if (book.isbn) {
    // Fallback to ISBN-based URL (has rate limits)
    const olUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
    result.cover_urls.openlibrary = olUrl;
    console.log(`  ⚠️  OpenLibrary ISBN URL (rate limited): ${olUrl}`);
  }
  
  // Try Google Books as fallback
  if (book.google_books_id && book.google_books_id !== 'demo-book-6') {
    const gbUrl = `https://books.google.com/books/content?id=${book.google_books_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
    result.cover_urls.google_books = gbUrl;
    console.log(`  ✅ Google Books URL: ${gbUrl}`);
  }
  
  // Determine recommended URL (priority: OLID/CoverID > Google Books > existing)
  if (result.cover_urls.openlibrary_olid || result.cover_urls.cover_id) {
    result.cover_urls.recommended = result.cover_urls.openlibrary;
    result.cover_urls.source = result.cover_urls.openlibrary_olid ? 'openlibrary_olid' : 'openlibrary_coverid';
    console.log(`  ⭐ RECOMMENDED: Open Library (no rate limits)`);
  } else if (result.cover_urls.google_books) {
    result.cover_urls.recommended = result.cover_urls.google_books;
    result.cover_urls.source = 'google_books';
    console.log(`  ⭐ RECOMMENDED: Google Books`);
  } else if (result.cover_urls.openlibrary) {
    result.cover_urls.recommended = result.cover_urls.openlibrary;
    result.cover_urls.source = 'openlibrary_isbn';
    console.log(`  ⚠️  RECOMMENDED: Open Library ISBN (rate limited)`);
  } else if (book.cover_url) {
    result.cover_urls.recommended = book.cover_url;
    result.cover_urls.source = 'existing';
    console.log(`  🔄 RECOMMENDED: Existing URL`);
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
