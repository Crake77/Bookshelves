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

// Suggest cross-tags with MUCH stricter matching to prevent false positives
function suggestCrossTags(book, domain) {
  const description = (book.description || '').toLowerCase();
  const title = book.title.toLowerCase();
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const tags = [];
  
  // CRITICAL: Detect if this is academic/analytical book
  const isAcademicBook = categories.some(cat => 
    cat.includes('literary criticism') || 
    cat.includes('criticism') ||
    cat.includes('social science') ||
    cat.includes('political science')
  ) || description.includes('analysis of') || description.includes('examination of');
  
  const allCrossTags = getCrossTagsByGroup();
  
  // Search through all cross-tag groups
  Object.keys(allCrossTags).forEach(group => {
    allCrossTags[group].forEach(tag => {
      const tagName = tag.name.toLowerCase();
      const tagSlug = tag.slug;
      
      // RULE 1: Require FULL slug or very specific phrase matching
      // Don't split tag names into individual words
      let matchScore = 0;
      
      // Check for exact slug match (with word boundaries)
      const slugPattern = new RegExp(`\\b${tagSlug.replace(/-/g, '[\\s-]')}\\b`, 'i');
      if (slugPattern.test(description)) matchScore += 5;
      if (slugPattern.test(title)) matchScore += 3;
      
      // Check for exact tag name match
      const namePattern = new RegExp(`\\b${tagName.replace(/[\s-]+/g, '[\\s-]')}\\b`, 'i');
      if (namePattern.test(description)) matchScore += 4;
      if (namePattern.test(title)) matchScore += 2;
      
      // RULE 2: Exclude structure/format tags from cross-tags
      // anthology is now detected as a format, not a tag
      const formatTags = ['anthology'];
      if (formatTags.includes(tagSlug)) {
        matchScore = 0; // Skip - this is a format, not a cross-tag
      }
      
      // Exclude other structure tags from academic books
      const structureTags = ['flash-fiction', 'micro-fiction', 'hypertext-fiction', 'epistolary'];
      if (isAcademicBook && structureTags.includes(tagSlug)) {
        // Skip these - academic books mention "fiction" constantly
        matchScore = 0;
      }
      
      // RULE 3: Exclude fairy-tale tags unless it's actually a fairy tale book
      const fairyTaleTags = ['fairy-tale', 'dark-fairy-tale', 'fairy-tale-retelling', 'fairy-tale-ending', 'twisted-fairy-tale'];
      if (fairyTaleTags.includes(tagSlug)) {
        // Only match if "fairy tale" appears as a complete phrase AND book is fiction
        if (!(/\bfairy[\s-]tales?\b/i.test(title) || /\bfairy[\s-]tales?\b/i.test(description)) || domain === 'non-fiction') {
          matchScore = 0;
        }
      }
      
      // RULE 4: Exclude fiction tropes from non-fiction books
      const fictionTropes = [
        'chosen-one', 'enemies-to-lovers', 'friends-to-lovers', 'love-triangle',
        'mentor-figure', 'quest', 'revenge', 'sacrifice', 'betrayal',
        'high-elves', 'dragons', 'magic-system', 'prophecy', 'portal',
        'time-travel', 'parallel-worlds', 'first-contact', 'space-opera'
      ];
      if (domain === 'non-fiction' && fictionTropes.includes(tagSlug)) {
        matchScore = 0;
      }
      
      // RULE 5: Require minimum match score of 3 (not just > 0)
      if (matchScore >= 3) {
        tags.push({
          slug: tagSlug,
          name: tag.name,
          group: tag.group,
          confidence: matchScore >= 5 ? 'high' : 'medium',
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
  
  // Load domain from previous task
  const domainPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let domain = 'fiction'; // default
  if (fs.existsSync(domainPath)) {
    const enrichmentData = JSON.parse(fs.readFileSync(domainPath, 'utf8'));
    domain = enrichmentData.taxonomy?.domain?.slug || 'fiction';
  }
  console.log(`  Domain: ${domain}`);
  
  const suggestedTags = suggestCrossTags(book, domain);
  
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
