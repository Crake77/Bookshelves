// Fix Eye of the World cover by fetching a better one
import fs from 'fs';
import 'dotenv/config';

const bookId = '42b1a772-97a1-4777-97cb-ae30b66feab8';
const enrichmentPath = `enrichment_data/${bookId}.json`;

// Load current enrichment data
const enrichmentData = JSON.parse(fs.readFileSync(enrichmentPath, 'utf8'));

console.log('Current cover URLs:');
console.log('  Recommended:', enrichmentData.cover_urls?.recommended);
console.log('  OpenLibrary:', enrichmentData.cover_urls?.openlibrary);
console.log('  Google Books:', enrichmentData.cover_urls?.google_books);

// The current cover is from OpenLibrary OLID which might be showing a photograph
// Let's try to get a better cover from Google Books using ISBN
const isbn13 = enrichmentData.external_metadata?.input_snapshot?.isbn13;
const isbn10 = enrichmentData.external_metadata?.input_snapshot?.isbn10;

console.log(`\nISBN-13: ${isbn13}`);
console.log(`ISBN-10: ${isbn10}`);

// Try Google Books API with ISBN
const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}`;

console.log(`\nFetching from Google Books: ${googleBooksUrl}`);

try {
  const response = await fetch(googleBooksUrl);
  const data = await response.json();
  
  if (data.items && data.items.length > 0) {
    const book = data.items[0];
    const volumeId = book.id;
    const imageLinks = book.volumeInfo?.imageLinks;
    
    if (imageLinks) {
      // Prefer large or extraLarge, fallback to medium
      const coverUrl = imageLinks.extraLarge || 
                       imageLinks.large || 
                       imageLinks.medium ||
                       imageLinks.small ||
                       imageLinks.thumbnail;
      
      if (coverUrl) {
        // Use Google Books direct URL for better quality
        const googleBooksDirectUrl = `https://books.google.com/books/content?id=${volumeId}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
        
        console.log(`\n✅ Found Google Books cover!`);
        console.log(`  Volume ID: ${volumeId}`);
        console.log(`  Direct URL: ${googleBooksDirectUrl}`);
        
        // Update enrichment data
        enrichmentData.cover_urls = enrichmentData.cover_urls || {};
        enrichmentData.cover_urls.google_books = googleBooksDirectUrl;
        enrichmentData.cover_urls.recommended = googleBooksDirectUrl;
        enrichmentData.cover_urls.source = 'google_books';
        enrichmentData.cover_urls.google_books_id = volumeId;
        enrichmentData.last_updated = new Date().toISOString();
        
        // Save updated data
        fs.writeFileSync(enrichmentPath, JSON.stringify(enrichmentData, null, 2));
        console.log(`\n✅ Updated cover URL in ${enrichmentPath}`);
      } else {
        console.log('⚠️  No image links found in Google Books response');
      }
    } else {
      console.log('⚠️  No imageLinks found in Google Books response');
    }
  } else {
    console.log('⚠️  No books found in Google Books API');
  }
} catch (error) {
  console.error('Error fetching from Google Books:', error.message);
}

