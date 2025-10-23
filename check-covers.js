#!/usr/bin/env node
/**
 * Cover Image Validator & Upgrader
 * 
 * Checks book cover URLs and attempts to find better quality images from legal sources:
 * - Google Books API (primary source)
 * - Open Library API (Internet Archive)
 * - ISBN DB APIs
 * 
 * Usage:
 *   node check-covers.js [book-id]           # Check specific book
 *   node check-covers.js --all               # Check all books
 *   node check-covers.js --batch batch-001   # Check specific batch
 *   node check-covers.js --fix               # Auto-fix broken/missing covers
 */

import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

// Legal cover image sources
const COVER_SOURCES = {
  GOOGLE_BOOKS: 'https://www.googleapis.com/books/v1/volumes',
  OPEN_LIBRARY_COVER: 'https://covers.openlibrary.org/b',
  OPEN_LIBRARY_API: 'https://openlibrary.org/api/books',
};

/**
 * Test if a URL returns a valid image
 */
async function validateImageUrl(url) {
  if (!url) return { valid: false, reason: 'No URL provided' };
  
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    
    if (!response.ok) {
      return { valid: false, reason: `HTTP ${response.status}` };
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return { valid: false, reason: `Not an image: ${contentType}` };
    }
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    
    // Some servers (like Open Library) don't return content-length on HEAD
    // If we have a valid image content-type, assume it's valid
    if (contentLength === 0) {
      return { valid: true, size: null, type: contentType };
    }
    
    if (contentLength < 1000) {
      return { valid: false, reason: `Too small: ${contentLength} bytes` };
    }
    
    return { valid: true, size: contentLength, type: contentType };
  } catch (error) {
    return { valid: false, reason: error.message };
  }
}

/**
 * Search Google Books API for better cover
 */
async function searchGoogleBooks(title, authors, isbn) {
  try {
    const queries = [];
    
    // Try ISBN first (most accurate)
    if (isbn) {
      queries.push(`isbn:${isbn}`);
    }
    
    // Try title + author
    if (title && authors?.length > 0) {
      const authorQuery = authors[0].replace(/\s+/g, '+');
      const titleQuery = title.replace(/\s+/g, '+');
      queries.push(`intitle:${titleQuery}+inauthor:${authorQuery}`);
    }
    
    for (const query of queries) {
      const url = `${COVER_SOURCES.GOOGLE_BOOKS}?q=${query}&maxResults=5`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (!data.items?.length) continue;
      
      // Find best quality cover
      for (const item of data.items) {
        const imageLinks = item.volumeInfo?.imageLinks;
        if (!imageLinks) continue;
        
        // Prefer extraLarge > large > medium > small > thumbnail
        const coverUrl = 
          imageLinks.extraLarge ||
          imageLinks.large ||
          imageLinks.medium ||
          imageLinks.small ||
          imageLinks.thumbnail;
        
        if (coverUrl) {
          // Upgrade to higher zoom level if possible
          const upgradedUrl = coverUrl.replace(/zoom=\d+/, 'zoom=1');
          return { url: upgradedUrl, source: 'Google Books', id: item.id };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Google Books search error:', error.message);
    return null;
  }
}

/**
 * Search Open Library for cover
 */
async function searchOpenLibrary(title, authors, isbn) {
  try {
    // Try ISBN first
    if (isbn) {
      const isbnClean = isbn.replace(/[^0-9X]/gi, '');
      
      // Try ISBN-based cover URL (fast)
      const coverUrl = `${COVER_SOURCES.OPEN_LIBRARY_COVER}/isbn/${isbnClean}-L.jpg`;
      const validation = await validateImageUrl(coverUrl);
      if (validation.valid) {
        return { url: coverUrl, source: 'Open Library (ISBN)', isbn: isbnClean };
      }
    }
    
    // Try API search by ISBN
    if (isbn) {
      const url = `${COVER_SOURCES.OPEN_LIBRARY_API}?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        const book = data[`ISBN:${isbn}`];
        if (book?.cover?.large) {
          return { url: book.cover.large, source: 'Open Library API', key: `ISBN:${isbn}` };
        }
      }
    }
    
    // Try title/author search if no ISBN or ISBN search failed
    if (title && authors?.length > 0) {
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(authors[0])}&limit=5`;
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        // Try each result until we find a valid cover
        for (const doc of data.docs || []) {
          // Try cover_i (cover ID) first
          if (doc.cover_i) {
            const coverUrl = `${COVER_SOURCES.OPEN_LIBRARY_COVER}/id/${doc.cover_i}-L.jpg`;
            const validation = await validateImageUrl(coverUrl);
            
            if (validation.valid) {
              return { 
                url: coverUrl, 
                source: 'Open Library (Search)', 
                cover_id: doc.cover_i,
                olid: doc.lending_edition_s || doc.edition_key?.[0],
                title: doc.title 
              };
            }
          }
          
          // Fallback to lending_edition_s or edition_key
          const olid = doc.lending_edition_s || doc.edition_key?.[0];
          if (olid) {
            const coverUrl = `${COVER_SOURCES.OPEN_LIBRARY_COVER}/olid/${olid}-L.jpg`;
            const validation = await validateImageUrl(coverUrl);
            
            if (validation.valid) {
              return { 
                url: coverUrl, 
                source: 'Open Library (OLID)', 
                olid: olid,
                title: doc.title 
              };
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Open Library search error:', error.message);
    return null;
  }
}

/**
 * Find best cover image for a book
 */
async function findBestCover(book) {
  console.log(`\n📚 Checking: "${book.title}" by ${book.authors?.[0] || 'Unknown'}`);
  console.log(`   Current URL: ${book.cover_url || '(none)'}`);
  
  // Validate current cover
  let currentValid = false;
  let currentSize = 0;
  if (book.cover_url) {
    const validation = await validateImageUrl(book.cover_url);
    currentValid = validation.valid;
    currentSize = validation.size || 0;
    console.log(`   Current: ${validation.valid ? '✅ Valid' : `❌ ${validation.reason}`}`);
    
    if (validation.valid && validation.size) {
      console.log(`   Size: ${(validation.size / 1024).toFixed(1)} KB`);
    }
  }
  
  // Search for alternatives
  const alternatives = [];
  
  // Open Library (check first - often most accurate for exact editions)
  const openLibResult = await searchOpenLibrary(book.title, book.authors, book.isbn);
  if (openLibResult) {
    const validation = await validateImageUrl(openLibResult.url);
    if (validation.valid) {
      alternatives.push({ ...openLibResult, ...validation });
      const sizeStr = validation.size ? `${(validation.size / 1024).toFixed(1)} KB` : 'Valid';
      console.log(`   📖 Open Library: ✅ ${sizeStr}`);
    }
  }
  
  // Google Books
  const googleResult = await searchGoogleBooks(book.title, book.authors, book.isbn);
  if (googleResult) {
    const validation = await validateImageUrl(googleResult.url);
    if (validation.valid) {
      alternatives.push({ ...googleResult, ...validation });
      const sizeStr = validation.size ? `${(validation.size / 1024).toFixed(1)} KB` : 'Valid';
      console.log(`   🔍 Google Books: ✅ ${sizeStr}`);
    }
  }
  
  // Pick best alternative
  if (alternatives.length > 0) {
    // Prefer Open Library for exact editions, otherwise largest file
    const openLibAlt = alternatives.find(a => a.source?.includes('Open Library'));
    const sortedBySize = [...alternatives].sort((a, b) => (b.size || 0) - (a.size || 0));
    
    let best;
    // If current is invalid or tiny, prefer Open Library if available
    if (!currentValid || currentSize < 5000) {
      best = openLibAlt || sortedBySize[0];
    } else {
      // Otherwise pick largest
      best = sortedBySize[0];
    }
    
    if (!currentValid || best !== undefined) {
      const sizeStr = best.size ? `${(best.size / 1024).toFixed(1)} KB` : 'Better match';
      console.log(`   ⭐ Best: ${best.source} (${sizeStr})`);
      return best;
    }
  }
  
  if (!currentValid && alternatives.length === 0) {
    console.log(`   ⚠️  No valid covers found`);
  }
  
  return null;
}

/**
 * Update book cover in database
 * If OLID/CoverID available, store it for rate-limit-free access
 */
async function updateBookCover(bookId, coverData, source) {
  const { url: newCoverUrl, olid, cover_id } = coverData;
  
  // Store OLID for unlimited cover access (best practice)
  if (olid) {
    await sql`
      UPDATE books 
      SET cover_url = ${newCoverUrl},
          openlibrary_edition_olid = ${olid},
          cover_olid = ${olid}
      WHERE id = ${bookId}
    `;
    console.log(`   ✅ Updated to ${source} + stored OLID: ${olid}`);
  } else if (cover_id) {
    await sql`
      UPDATE books 
      SET cover_url = ${newCoverUrl},
          cover_olid = ${'ID:' + cover_id}
      WHERE id = ${bookId}
    `;
    console.log(`   ✅ Updated to ${source} + stored CoverID: ${cover_id}`);
  } else {
    // Fallback: just store URL (e.g., Google Books)
    await sql`
      UPDATE books 
      SET cover_url = ${newCoverUrl}
      WHERE id = ${bookId}
    `;
    console.log(`   ✅ Updated to ${source}`);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const bookId = args.find(arg => !arg.startsWith('--'));
  const fixMode = args.includes('--fix');
  const allMode = args.includes('--all');
  const batchMode = args.find(arg => arg.startsWith('--batch='));
  
  let books = [];
  
  if (bookId) {
    // Single book
    const rows = await sql`
      SELECT id, title, authors, isbn, cover_url
      FROM books 
      WHERE id = ${bookId}
    `;
    books = rows;
  } else if (allMode) {
    // All books
    books = await sql`
      SELECT id, title, authors, isbn, cover_url
      FROM books
      ORDER BY created_at DESC
    `;
  } else if (batchMode) {
    // Specific batch
    const batchId = batchMode.split('=')[1];
    books = await sql`
      SELECT id, title, authors, isbn, cover_url
      FROM books
      WHERE batch = ${batchId}
      ORDER BY title
    `;
  } else {
    console.log('Usage:');
    console.log('  node check-covers.js [book-id]           # Check specific book');
    console.log('  node check-covers.js --all               # Check all books');
    console.log('  node check-covers.js --batch=batch-001   # Check specific batch');
    console.log('  node check-covers.js --fix [book-id]     # Auto-fix covers');
    process.exit(1);
  }
  
  if (books.length === 0) {
    console.log('No books found');
    return;
  }
  
  console.log(`\n🔍 Checking ${books.length} book(s)...\n`);
  
  let fixedCount = 0;
  let validCount = 0;
  let brokenCount = 0;
  
  for (const book of books) {
    const betterCover = await findBestCover(book);
    
    if (betterCover && fixMode) {
      await updateBookCover(book.id, betterCover, betterCover.source);
      fixedCount++;
    } else if (betterCover) {
      console.log(`   💡 Run with --fix to update`);
    } else if (book.cover_url) {
      validCount++;
    } else {
      brokenCount++;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Summary:');
  if (fixMode) {
    console.log(`   ✅ Fixed: ${fixedCount}`);
    console.log(`   ✓  Valid: ${validCount}`);
    console.log(`   ⚠️  Still broken: ${brokenCount}`);
  } else {
    console.log(`   ✓  Valid: ${validCount}`);
    console.log(`   🔄 Can upgrade: ${brokenCount}`);
    console.log(`\n   Run with --fix to apply updates`);
  }
}

main().catch(console.error);
