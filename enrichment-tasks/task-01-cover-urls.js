// Task 1: Fetch Cover URLs & Open Library ID (OLID)
// Usage: node task-01-cover-urls.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json
//
// Priority: Quality-first approach
// 1. Google Books (clean digital covers) - preferred for quality
// 2. OpenLibrary OLID/CoverID (but may be scans) - fallback
// 3. Existing URL (if clean)
// See: LEGAL_DATA_STRATEGY.md for cover sourcing best practices

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

/**
 * Check if a Google Books URL indicates a scanned/photographed cover
 * Red flags: edge=curl, edge=shadow, etc. indicate book scans
 */
function isLowQualityGoogleBooksUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lowerUrl = url.toLowerCase();
  // These parameters indicate scanned/photographed books, not digital covers
  return lowerUrl.includes('edge=curl') || 
         lowerUrl.includes('edge=shadow') ||
         lowerUrl.includes('edge=thumb');
}

/**
 * Clean Google Books URL - remove edge parameters and use clean zoom
 */
function cleanGoogleBooksUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Remove edge parameters that indicate scans
  let cleanUrl = url.replace(/&edge=[^&]*/gi, '');
  cleanUrl = cleanUrl.replace(/edge=[^&]*&/gi, '');
  
  // Ensure zoom=1 for good quality
  if (!cleanUrl.includes('zoom=')) {
    cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'zoom=1';
  }
  
  // Ensure source parameter
  if (!cleanUrl.includes('source=')) {
    cleanUrl += '&source=gbs_api';
  }
  
  return cleanUrl;
}

/**
 * Score cover quality - higher is better
 */
function scoreCoverQuality(url, source) {
  let score = 0;
  
  if (!url) return -1;
  
  // Google Books clean URLs are highest quality
  if (source === 'google_books' && !isLowQualityGoogleBooksUrl(url)) {
    score += 100;
  }
  
  // Google Books with edge parameters (scans) are lower quality
  if (source === 'google_books' && isLowQualityGoogleBooksUrl(url)) {
    score += 30;
  }
  
  // OpenLibrary OLID/CoverID - medium quality (may be scans)
  if (source === 'openlibrary_olid' || source === 'openlibrary_coverid') {
    score += 50;
  }
  
  // OpenLibrary ISBN - lower priority (rate limited)
  if (source === 'openlibrary_isbn') {
    score += 40;
  }
  
  // Existing URL - unknown quality
  if (source === 'existing') {
    // If it's a clean Google Books URL, it's good
    if (url.includes('books.google.com') && !isLowQualityGoogleBooksUrl(url)) {
      score += 80;
    } else {
      score += 20;
    }
  }
  
  return score;
}

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
      google_books_clean: null,
      openlibrary: null,
      openlibrary_olid: null,
      cover_id: null,
      recommended: null,
      source: null,
      quality_score: null,
      quality_notes: []
    },
    timestamp: new Date().toISOString()
  };
  
  // Fetch Open Library OLID (for fallback, but prioritize Google Books for quality)
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
  
  // Process Google Books URL (preferred for quality)
  if (book.google_books_id && book.google_books_id !== 'demo-book-6') {
    const gbUrlRaw = `https://books.google.com/books/content?id=${book.google_books_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
    result.cover_urls.google_books = gbUrlRaw;
    
    // Check if existing URL is low quality (has scan indicators)
    const existingIsLowQuality = book.cover_url && isLowQualityGoogleBooksUrl(book.cover_url);
    if (existingIsLowQuality) {
      result.cover_urls.quality_notes.push('Existing Google Books URL has scan indicators (edge=curl)');
      console.log(`  ⚠️  Existing Google Books URL appears to be a scan (low quality)`);
    }
    
    // Create clean version (no edge parameters)
    const gbUrlClean = cleanGoogleBooksUrl(gbUrlRaw);
    result.cover_urls.google_books_clean = gbUrlClean;
    console.log(`  ✅ Google Books URL (clean): ${gbUrlClean}`);
    
    // If existing URL was low quality, note we're using clean version
    if (existingIsLowQuality) {
      result.cover_urls.quality_notes.push('Using clean Google Books URL (removed scan parameters)');
    }
  }
  
  // Generate Open Library cover URLs from OLID/CoverID
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
  
  // Determine recommended URL using quality scoring
  const candidates = [];
  
  // Candidate 1: Clean Google Books (highest quality)
  if (result.cover_urls.google_books_clean) {
    const score = scoreCoverQuality(result.cover_urls.google_books_clean, 'google_books');
    candidates.push({
      url: result.cover_urls.google_books_clean,
      source: 'google_books',
      score: score,
      label: 'Google Books (clean digital cover)'
    });
  }
  
  // Candidate 2: Existing Google Books if clean
  if (book.cover_url && book.cover_url.includes('books.google.com') && !isLowQualityGoogleBooksUrl(book.cover_url)) {
    const score = scoreCoverQuality(book.cover_url, 'existing');
    candidates.push({
      url: book.cover_url,
      source: 'existing',
      score: score,
      label: 'Existing Google Books URL (clean)'
    });
  }
  
  // Candidate 3: OpenLibrary OLID (may be scans, but no rate limits)
  if (result.cover_urls.openlibrary && (result.cover_urls.openlibrary_olid || result.cover_urls.cover_id)) {
    const source = result.cover_urls.openlibrary_olid ? 'openlibrary_olid' : 'openlibrary_coverid';
    const score = scoreCoverQuality(result.cover_urls.openlibrary, source);
    candidates.push({
      url: result.cover_urls.openlibrary,
      source: source,
      score: score,
      label: 'OpenLibrary (may be scanned cover)'
    });
  }
  
  // Candidate 4: OpenLibrary ISBN (rate limited)
  if (result.cover_urls.openlibrary && !result.cover_urls.openlibrary_olid && !result.cover_urls.cover_id) {
    const score = scoreCoverQuality(result.cover_urls.openlibrary, 'openlibrary_isbn');
    candidates.push({
      url: result.cover_urls.openlibrary,
      source: 'openlibrary_isbn',
      score: score,
      label: 'OpenLibrary ISBN (rate limited)'
    });
  }
  
  // Candidate 5: Existing URL (if not already considered)
  if (book.cover_url && !book.cover_url.includes('books.google.com')) {
    const score = scoreCoverQuality(book.cover_url, 'existing');
    candidates.push({
      url: book.cover_url,
      source: 'existing',
      score: score,
      label: 'Existing URL'
    });
  }
  
  // Pick best candidate by score
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    result.cover_urls.recommended = best.url;
    result.cover_urls.source = best.source;
    result.cover_urls.quality_score = best.score;
    
    console.log(`  ⭐ RECOMMENDED: ${best.label} (quality score: ${best.score})`);
    
    if (candidates.length > 1) {
      console.log(`  📊 Alternatives considered: ${candidates.length - 1} other sources`);
      candidates.slice(1).forEach(c => {
        console.log(`     - ${c.label} (score: ${c.score})`);
      });
    }
  } else {
    console.log(`  ⚠️  No cover URLs found`);
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
