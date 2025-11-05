// Task 4: Assign Domain + Supergenres
// Usage: node task-04-domain-supergenres.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

// Load taxonomy data (we'll load relevant parts)
const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));

// Simplified domain determination based on categories
function determineDomain(book) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const title = book.title.toLowerCase();
  const description = (book.description || '').toLowerCase();
  
  // PRIORITY 1: Detect academic/analytical books (books ABOUT other genres)
  const academicPhrases = [
    'analysis of', 'examination of', 'study of', 'reading of',
    'approaches to', 'perspectives on', 'introduction to',
    'history of', 'theory of', 'criticism of'
  ];
  
  const hasAcademicPhrase = academicPhrases.some(phrase => 
    description.includes(phrase) || title.includes(phrase)
  );
  
  // Check if title contains genre name + 'in/of/and' pattern
  // e.g., "Fantasy in Young Adult", "Justice in Speculative Fiction"
  const genreAnalysisPattern = /(fiction|fantasy|science fiction|mystery|romance|horror|thriller) (in|of|and|for)/i;
  const isGenreAnalysis = genreAnalysisPattern.test(title);
  
  if (hasAcademicPhrase || isGenreAnalysis) {
    return { 
      slug: 'non-fiction', 
      confidence: 'high', 
      reason: 'Academic/analytical work (about genres, not in a genre)' 
    };
  }
  
  // PRIORITY 2: Literary criticism is always non-fiction
  if (categories.some(cat => cat.includes('literary criticism') || cat.includes('criticism'))) {
    return { slug: 'non-fiction', confidence: 'high', reason: 'Literary criticism is non-fiction' };
  }
  
  // PRIORITY 3: Detect "Social Science", "Political Science" etc.
  // BUT: Exclude fiction genres that might contain these words (e.g., "Science Fiction")
  const fictionGenreKeywords = ['fiction', 'fantasy', 'romance', 'mystery', 'thriller', 'horror'];
  const hasFictionGenre = categories.some(cat => 
    fictionGenreKeywords.some(fg => cat.includes(fg))
  );
  
  const explicitNonfictionCategories = [
    'social science', 'political science', 'psychology', 'sociology',
    'history', 'biography', 'memoir', 'philosophy', 'religion',
    'business', 'self-help', 'science', 'technology', 'reference'
  ];
  
  const hasNonfictionCategory = categories.some(cat =>
    explicitNonfictionCategories.some(nf => cat.includes(nf))
  );
  
  // If book has both fiction genre AND non-fiction category keyword, trust fiction genre
  if (hasNonfictionCategory && hasFictionGenre) {
    console.log(`    ℹ️  Categories contain both fiction genre and non-fiction keywords - trusting fiction genre`);
    return { 
      slug: 'fiction', 
      confidence: 'high', 
      reason: `Fiction genre overrides keyword match: ${categories.join(', ')}` 
    };
  }
  
  if (hasNonfictionCategory) {
    return { 
      slug: 'non-fiction', 
      confidence: 'high', 
      reason: `Explicit non-fiction category: ${categories.join(', ')}` 
    };
  }
  
  // PRIORITY 4: Fiction indicators
  const fictionKeywords = ['novel', 'fiction', 'fantasy', 'science fiction', 'mystery', 'thriller', 'romance', 'horror'];
  const hasFictionCategory = categories.some(cat =>
    fictionKeywords.some(fk => cat === fk || cat === fk + 's')
  );
  
  if (hasFictionCategory && !categories.includes('fiction')) {
    // Has specific fiction genre but not generic "Fiction" - likely a novel
    return { slug: 'fiction', confidence: 'high', reason: `Fiction genre category: ${categories.join(', ')}` };
  }
  
  if (categories.includes('fiction')) {
    return { slug: 'fiction', confidence: 'medium', reason: 'Generic fiction category' };
  }
  
  // Default: needs manual review
  return { slug: 'fiction', confidence: 'low', reason: 'Default - needs manual review' };
}

// Suggest supergenres based on categories and genres
function suggestSupergenres(book, domain) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const supergenres = [];
  
    // Common mappings (simplified - real version would use full taxonomy)
  // NOTE: For fiction books, use speculative-fiction supergenre (not science-technology)
  const supergenreMap = {
    'science fiction': ['speculative-fiction'],
    'fantasy': ['speculative-fiction'],
    'mystery': ['mystery-thriller'],
    'thriller': ['mystery-thriller'],
    'romance': ['romance'],
    'horror': ['horror-supernatural'],
    'literary criticism': ['literature-writing'],
    'history': ['history-social-sciences'],
    'biography': ['biography-memoir'],
    'business': ['business-economics'],
    // For non-fiction science books, use science-nature supergenre
    // For technology/engineering books, use technology-engineering supergenre
    'science': domain === 'non-fiction' ? ['science-nature'] : [],
    'technology': domain === 'non-fiction' ? ['technology-engineering'] : [],
    'engineering': domain === 'non-fiction' ? ['technology-engineering'] : []
  };
  
  categories.forEach(cat => {
    Object.keys(supergenreMap).forEach(key => {
      if (cat.includes(key) && !supergenres.includes(supergenreMap[key][0])) {
        supergenres.push(supergenreMap[key][0]);
      }
    });
  });
  
  // Return 1-2 supergenres
  return supergenres.slice(0, 2);
}

async function assignDomainSupergenres(bookId) {
  console.log(`🏷️  Task 4: Assigning domain + supergenres for book ${bookId}...`);
  
  // Load book from appropriate batch file
  const { loadBookFromBatch } = await import('./helpers.js');
  const book = loadBookFromBatch(bookId);
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Categories: ${JSON.stringify(book.categories)}`);
  
  const domainResult = determineDomain(book);
  const supergenreResults = suggestSupergenres(book, domainResult.slug);
  
  const result = {
    book_id: bookId,
    taxonomy: {
      domain: {
        slug: domainResult.slug,
        confidence: domainResult.confidence,
        reason: domainResult.reason
      },
      supergenres: supergenreResults.map(sg => ({
        slug: sg,
        confidence: 'suggested',
        reason: 'Derived from categories'
      })),
      status: supergenreResults.length > 0 ? 'suggested' : 'needs_manual_review',
      notes: []
    },
    timestamp: new Date().toISOString()
  };
  
  console.log(`  ✅ Domain: ${result.taxonomy.domain.slug} (${result.taxonomy.domain.confidence})`);
  console.log(`  ✅ Supergenres: ${supergenreResults.join(', ') || 'NONE - needs manual assignment'}`);
  
  if (supergenreResults.length === 0) {
    result.taxonomy.notes.push('WARNING: No supergenres could be automatically suggested');
    result.taxonomy.notes.push('MANUAL STEP: Assign 1-2 supergenres from taxonomy');
  }
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  enrichmentData.taxonomy = result.taxonomy;
  enrichmentData.last_updated = result.timestamp;
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

// Run if called directly
const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-04-domain-supergenres.js <book_id>');
  process.exit(1);
}

assignDomainSupergenres(bookId).catch(console.error);
