// Task 6: Assign Cross-Tags (10-20)
// Usage: node task-06-cross-tags.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));

// Get all cross-tags organized by group
function getCrossTagsByGroup() {
  const byGroup = {};
  Object.keys(taxonomy.cross_tags.by_group).forEach(group => {
    byGroup[group] = taxonomy.cross_tags.by_group[group];
  });
  return byGroup;
}

// Suggest cross-tags based on description, categories, and metadata
function suggestCrossTags(book) {
  const description = (book.description || '').toLowerCase();
  const title = book.title.toLowerCase();
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const tags = [];
  
  const allCrossTags = getCrossTagsByGroup();
  
  // Search through all cross-tag groups
  Object.keys(allCrossTags).forEach(group => {
    allCrossTags[group].forEach(tag => {
      const tagName = tag.name.toLowerCase();
      const tagSlug = tag.slug;
      
      // Keyword matching in description and title
      const keywords = tagName.split(/[\s-]+/).filter(k => k.length > 3);
      const matchScore = keywords.reduce((score, keyword) => {
        if (description.includes(keyword)) score += 2;
        if (title.includes(keyword)) score += 1;
        return score;
      }, 0);
      
      if (matchScore > 0) {
        tags.push({
          slug: tagSlug,
          name: tag.name,
          group: tag.group,
          confidence: matchScore > 2 ? 'high' : 'medium',
          match_score: matchScore
        });
      }
    });
  });
  
  // Sort by match score and return top 20
  tags.sort((a, b) => b.match_score - a.match_score);
  return tags.slice(0, 20);
}

async function assignCrossTags(bookId) {
  console.log(`🏷️  Task 6: Assigning cross-tags for book ${bookId}...`);
  
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  
  const suggestedTags = suggestCrossTags(book);
  
  const result = {
    cross_tags: suggestedTags,
    count: suggestedTags.length,
    status: suggestedTags.length >= 10 ? 'sufficient' : 'needs_more',
    notes: []
  };
  
  console.log(`  ✅ Cross-tags suggested: ${result.count}`);
  
  if (result.count < 10) {
    result.notes.push(`WARNING: Only ${result.count} tags suggested, minimum is 10`);
    result.notes.push('MANUAL STEP: Add more cross-tags to reach 10-20');
  } else if (result.count > 20) {
    result.cross_tags = result.cross_tags.slice(0, 20);
    result.count = 20;
  }
  
  // Show tag breakdown by group
  const byGroup = {};
  result.cross_tags.forEach(tag => {
    byGroup[tag.group] = (byGroup[tag.group] || 0) + 1;
  });
  
  console.log(`  📊 Tags by group:`);
  Object.keys(byGroup).forEach(group => {
    console.log(`     ${group}: ${byGroup[group]}`);
  });
  
  // Save result
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = {};
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  if (!enrichmentData.taxonomy) enrichmentData.taxonomy = {};
  enrichmentData.taxonomy.cross_tags = result.cross_tags;
  enrichmentData.taxonomy.cross_tags_count = result.count;
  enrichmentData.last_updated = new Date().toISOString();
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-06-cross-tags.js <book_id>');
  process.exit(1);
}

assignCrossTags(bookId).catch(console.error);
