// Task 7: Detect Format + Audience
// Usage: node task-07-format-audience.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';

// Detect format (hardcover, paperback, ebook, audiobook)
function detectFormat(book) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const description = (book.description || '').toLowerCase();
  
  // For now, we can't reliably detect format from available data
  // This would require API data about specific editions
  return {
    slug: null,
    confidence: 'unknown',
    reason: 'Format cannot be determined from available metadata'
  };
}

// Detect audience (adult, young-adult, middle-grade, children)
function detectAudience(book) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const description = (book.description || '').toLowerCase();
  const title = book.title.toLowerCase();
  
  // Check for explicit age market indicators
  if (categories.some(c => c.includes('juvenile') || c.includes('children'))) {
    if (categories.some(c => c.includes('young adult') || c.includes('ya'))) {
      return {
        slug: 'young-adult',
        confidence: 'high',
        reason: 'Category indicates Young Adult'
      };
    }
    return {
      slug: 'children',
      confidence: 'medium',
      reason: 'Category indicates Juvenile/Children'
    };
  }
  
  // Check description for age indicators
  if (description.includes('young adult') || description.includes('teen')) {
    return {
      slug: 'young-adult',
      confidence: 'medium',
      reason: 'Description mentions young adult/teen themes'
    };
  }
  
  if (description.includes('middle grade') || description.includes('ages 8-12')) {
    return {
      slug: 'middle-grade',
      confidence: 'medium',
      reason: 'Description mentions middle grade'
    };
  }
  
  // Check for academic/adult indicators
  if (description.includes('academic') || description.includes('researchers') ||
      description.includes('scholars') || description.includes('postgraduate')) {
    return {
      slug: 'adult',
      confidence: 'high',
      reason: 'Academic audience indicated'
    };
  }
  
  // Default to adult for most books
  return {
    slug: 'adult',
    confidence: 'low',
    reason: 'Default - no specific age market indicators found'
  };
}

async function detectFormatAudience(bookId) {
  console.log(`👥 Task 7: Detecting format + audience for book ${bookId}...`);
  
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  
  const format = detectFormat(book);
  const audience = detectAudience(book);
  
  const result = {
    format: format,
    audience: audience,
    notes: []
  };
  
  if (format.slug) {
    console.log(`  ✅ Format: ${format.slug} (${format.confidence})`);
  } else {
    console.log(`  ⚠️  Format: Unknown - ${format.reason}`);
    result.notes.push('Format could not be determined - leave NULL or manually review');
  }
  
  console.log(`  ✅ Audience: ${audience.slug} (${audience.confidence})`);
  if (audience.confidence === 'low') {
    result.notes.push('Audience detection has low confidence - may need manual review');
  }
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  enrichmentData.format = result.format;
  enrichmentData.audience = result.audience;
  enrichmentData.last_updated = new Date().toISOString();
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-07-format-audience.js <book_id>');
  process.exit(1);
}

detectFormatAudience(bookId).catch(console.error);
