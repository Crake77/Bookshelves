// Task 5: Assign Genres + Subgenres
// Usage: node task-05-genres-subgenres.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));

// Helper to find genre by slug
function findGenre(slug) {
  return taxonomy.genres.find(g => g.slug === slug);
}

// Helper to find subgenres for a genre
function findSubgenres(genreSlug) {
  return taxonomy.subgenres.filter(sg => sg.genre_slug === genreSlug);
}

// Suggest genres based on categories with domain validation
function suggestGenres(book, domain) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const title = book.title.toLowerCase();
  const genreSlugs = [];
  
  // CRITICAL: Literary Criticism is a NON-FICTION field, not a fiction genre
  // Don't map it to 'literary-fiction' which is a fiction genre
  if (categories.some(cat => cat.includes('literary criticism') || cat.includes('criticism'))) {
    // This is academic analysis - check domain
    if (domain === 'non-fiction') {
      // Could be literary-criticism, cultural-studies, etc.
      // For now, leave empty and require manual assignment
      return [];
    }
  }
  
  // CRITICAL: Google Books often adds spurious "Fantasy" category based on title words
  // Only trust "Fantasy" if there's supporting evidence
  if (categories.includes('fantasy') && domain === 'non-fiction') {
    // Remove fantasy from categories - it's likely a false positive
    console.log(`    ⚠️  Ignoring spurious 'Fantasy' category for non-fiction book (likely from title)`);
    const filteredCategories = categories.filter(c => c !== 'fantasy');
    if (filteredCategories.length === 0) {
      return [];
    }
    // Continue with filtered categories
    categories.length = 0;
    categories.push(...filteredCategories);
  }
  
  // Filter out fiction genres if domain is non-fiction
  const fictionGenres = ['fantasy', 'science-fiction', 'mystery', 'thriller', 'romance', 'horror', 'literary-fiction'];
  const nonfictionGenres = ['history', 'biography', 'memoir', 'autobiography', 'business', 'economics', 'psychology', 'philosophy'];
  
  // Direct mappings from API categories to taxonomy genres
  const genreMap = {
    'science fiction': 'science-fiction',
    'fantasy': 'fantasy',
    'mystery': 'mystery',
    'thriller': 'thriller',
    'romance': 'romance',
    'horror': 'horror',
    'history': 'history',
    'biography': 'biography',
    'autobiography': 'autobiography',
    'business': 'business',
    'economics': 'economics',
    'juvenile nonfiction': 'reference',
    'social science': 'sociology',
    'political science': 'political-science'
  };
  
  categories.forEach(cat => {
    Object.keys(genreMap).forEach(key => {
      if (cat.includes(key)) {
        const slug = genreMap[key];
        
        // VALIDATION: Check if genre matches domain
        const isFictionGenre = fictionGenres.includes(slug);
        const isNonfictionGenre = nonfictionGenres.includes(slug);
        
        if (domain === 'fiction' && isNonfictionGenre) {
          // Skip non-fiction genres for fiction books
          console.log(`    ⚠️  Skipping non-fiction genre '${slug}' for fiction book`);
          return;
        }
        
        if (domain === 'non-fiction' && isFictionGenre) {
          // Skip fiction genres for non-fiction books
          console.log(`    ⚠️  Skipping fiction genre '${slug}' for non-fiction book (likely from title keyword)`);
          return;
        }
        
        if (!genreSlugs.includes(slug) && findGenre(slug)) {
          genreSlugs.push(slug);
        }
      }
    });
  });
  
  return genreSlugs.slice(0, 3); // Max 3 genres
}

// Suggest subgenres based on title, description and genres
function suggestSubgenres(book, genreSlugs) {
  const description = (book.description || '').toLowerCase();
  const title = book.title.toLowerCase();
  const subgenres = [];
  
  // For each assigned genre, look for relevant subgenres
  genreSlugs.forEach(genreSlug => {
    const availableSubgenres = findSubgenres(genreSlug);
    
    // Check for FULL subgenre name in title or description (not individual words)
    availableSubgenres.forEach(sg => {
      const subgenreName = sg.name.toLowerCase();
      const subgenreSlug = sg.slug.toLowerCase();
      
      // Create regex pattern for full name match (with word boundaries)
      const namePattern = new RegExp(`\\b${subgenreName.replace(/[\s-]+/g, '[\\s-]')}\\b`, 'i');
      const slugPattern = new RegExp(`\\b${subgenreSlug.replace(/-/g, '[\\s-]')}\\b`, 'i');
      
      let matched = false;
      if (namePattern.test(title) || slugPattern.test(title)) {
        matched = true;
      } else if (namePattern.test(description) || slugPattern.test(description)) {
        matched = true;
      }
      
      if (matched && !subgenres.find(s => s.slug === sg.slug)) {
        subgenres.push({
          slug: sg.slug,
          name: sg.name,
          genre_slug: sg.genre_slug
        });
      }
    });
  });
  
  return subgenres.slice(0, 5); // Max 5 subgenres
}

async function assignGenresSubgenres(bookId) {
  console.log(`📚 Task 5: Assigning genres + subgenres for book ${bookId}...`);
  
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Categories: ${JSON.stringify(book.categories)}`);
  
  // Load domain from previous task
  const domainPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let domain = 'fiction'; // default
  if (fs.existsSync(domainPath)) {
    const enrichmentData = JSON.parse(fs.readFileSync(domainPath, 'utf8'));
    domain = enrichmentData.taxonomy?.domain?.slug || 'fiction';
  }
  console.log(`  Domain: ${domain}`);
  
  const genreSlugs = suggestGenres(book, domain);
  const subgenres = suggestSubgenres(book, genreSlugs);
  
  const result = {
    genres: genreSlugs.map(slug => ({
      slug,
      name: findGenre(slug)?.name || slug,
      confidence: 'suggested'
    })),
    subgenres: subgenres.map(sg => ({
      slug: sg.slug,
      name: sg.name,
      genre_slug: sg.genre_slug,
      confidence: 'suggested'
    })),
    status: genreSlugs.length > 0 ? 'suggested' : 'needs_manual_review',
    notes: []
  };
  
  console.log(`  ✅ Genres (${result.genres.length}): ${genreSlugs.join(', ')}`);
  console.log(`  ✅ Subgenres (${result.subgenres.length}): ${subgenres.map(s => s.slug).join(', ')}`);
  
  if (genreSlugs.length === 0) {
    result.notes.push('WARNING: No genres automatically suggested');
    result.notes.push('MANUAL STEP: Assign 1-3 genres from taxonomy');
  }
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  if (!enrichmentData.taxonomy) enrichmentData.taxonomy = {};
  enrichmentData.taxonomy.genres = result.genres;
  enrichmentData.taxonomy.subgenres = result.subgenres;
  enrichmentData.last_updated = new Date().toISOString();
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-05-genres-subgenres.js <book_id>');
  process.exit(1);
}

assignGenresSubgenres(bookId).catch(console.error);
