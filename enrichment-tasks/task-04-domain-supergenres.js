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
  
  // Fiction indicators
  const fictionKeywords = ['fiction', 'novel', 'fantasy', 'science fiction', 'mystery', 'thriller', 'romance', 'horror'];
  // Non-fiction indicators  
  const nonfictionKeywords = ['history', 'biography', 'science', 'philosophy', 'business', 'self-help', 'criticism', 'guide'];
  
  let fictionScore = 0;
  let nonfictionScore = 0;
  
  categories.forEach(cat => {
    if (fictionKeywords.some(kw => cat.includes(kw))) fictionScore++;
    if (nonfictionKeywords.some(kw => cat.includes(kw))) nonfictionScore++;
  });
  
  // Literary criticism about fiction is non-fiction
  if (categories.includes('literary criticism')) {
    return { slug: 'non-fiction', confidence: 'high', reason: 'Literary criticism is non-fiction' };
  }
  
  if (fictionScore > nonfictionScore) {
    return { slug: 'fiction', confidence: 'medium', reason: `Fiction indicators in categories (score: ${fictionScore})` };
  } else if (nonfictionScore > fictionScore) {
    return { slug: 'non-fiction', confidence: 'medium', reason: `Non-fiction indicators in categories (score: ${nonfictionScore})` };
  }
  
  // Default to fiction for novels/stories
  return { slug: 'fiction', confidence: 'low', reason: 'Default - needs manual review' };
}

// Suggest supergenres based on categories and genres
function suggestSupergenres(book, domain) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const supergenres = [];
  
  // Common mappings (simplified - real version would use full taxonomy)
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
    'science': ['science-technology']
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
  
  // Load book batch data
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
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
