// Task 6: Assign Cross-Tags (10-20)
// Usage: node task-06-cross-tags.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));
const crossTagPatterns = JSON.parse(fs.readFileSync('cross_tag_patterns_v1.json', 'utf8')).patterns;

const CROSS_TAG_META = new Map();
Object.entries(taxonomy.cross_tags.by_group || {}).forEach(([group, tags]) => {
  if (Array.isArray(tags)) {
    tags.forEach((tag) => {
      if (tag?.slug) {
        CROSS_TAG_META.set(tag.slug, { name: tag.name ?? tag.slug, group });
      }
    });
  }
});

function getCrossTagMeta(slug) {
  return CROSS_TAG_META.get(slug) ?? { name: slug, group: 'trope' };
}

function getEvidenceSources(enrichmentData) {
  const sources = enrichmentData?.evidence?.sources;
  if (!Array.isArray(sources)) return [];
  return sources
    .filter((source) => typeof source.extract === 'string' && source.extract.trim().length)
    .map((source) => ({
      snapshotId: source.snapshot_id || source.id || null,
      label: source.source_key || source.source,
      source: source.source,
      extract: source.extract.toLowerCase(),
    }));
}

// Get all cross-tags organized by group
function getCrossTagsByGroup() {
  const byGroup = {};
  Object.keys(taxonomy.cross_tags.by_group).forEach(group => {
    byGroup[group] = taxonomy.cross_tags.by_group[group];
  });
  return byGroup;
}

// Suggest cross-tags with MUCH stricter matching to prevent false positives
function suggestCrossTags(book, domain, enrichmentData = null) {
  // Use enriched summary if original description is null/empty
  let description = (book.description || '').toLowerCase();
  if (!description && enrichmentData?.summary?.new_summary) {
    description = enrichmentData.summary.new_summary.toLowerCase();
    console.log(`    ℹ️  Using enriched summary for cross-tag detection (no original description)`);
  }
  
  const title = book.title.toLowerCase();
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const evidenceSources = getEvidenceSources(enrichmentData);
  if (evidenceSources.length) {
    console.log(`    🧾 Evidence sources available: ${evidenceSources.length}`);
  }

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
      const provenanceSources = new Set();
      
      // Check for exact slug match (with word boundaries)
      const slugPattern = new RegExp(`\\b${tagSlug.replace(/-/g, '[\\s-]')}\\b`, 'i');
      const namePattern = new RegExp(`\\b${tagName.replace(/[\s-]+/g, '[\\s-]')}\\b`, 'i');

      const applyMatch = (text, slugWeight = 0, nameWeight = 0, provenanceId = null) => {
        if (!text) return;
        if (slugWeight && slugPattern.test(text)) {
          matchScore += slugWeight;
          if (provenanceId) provenanceSources.add(provenanceId);
        }
        if (nameWeight && namePattern.test(text)) {
          matchScore += nameWeight;
          if (provenanceId) provenanceSources.add(provenanceId);
        }
      };

      applyMatch(description, 5, 4);
      applyMatch(title, 3, 2);
      applyMatch(categories.join(' '), 2, 1);

      evidenceSources.forEach((source) => {
        applyMatch(source.extract, 5, 4, source.snapshotId);
      });
      
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
        const entry = {
          slug: tagSlug,
          name: tag.name,
          group: tag.group,
          confidence: matchScore >= 5 ? 'high' : 'medium',
          match_score: matchScore,
          method: evidenceSources.length > 0 ? 'pattern-match+evidence' : 'pattern-match',
        };
        if (provenanceSources.size > 0) {
          entry.provenance_snapshot_ids = Array.from(provenanceSources);
        }
        tags.push(entry);
      }
    });
  });
  
  // Sort by match score and return top 20
  tags.sort((a, b) => b.match_score - a.match_score);

  if (tags.length < 20) {
    const patternMatches = generatePatternTags(book, enrichmentData, evidenceSources);
    const existingSlugs = new Set(tags.map((tag) => tag.slug));
    for (const match of patternMatches) {
      if (existingSlugs.has(match.slug)) continue;
      tags.push(match);
      existingSlugs.add(match.slug);
      if (tags.length >= 20) break;
    }
  }

  return tags.slice(0, 20);
}

function generatePatternTags(book, enrichmentData, evidenceSources) {
  if (!crossTagPatterns) return [];
  const segments = [];
  if (book.title) segments.push(book.title);
  if (book.description) segments.push(book.description);
  if (Array.isArray(book.categories) && book.categories.length) {
    segments.push(book.categories.join(' '));
  }
  if (enrichmentData?.summary?.new_summary) {
    segments.push(enrichmentData.summary.new_summary);
  }
  evidenceSources.forEach((source) => {
    if (source.extract) segments.push(source.extract);
  });
  const haystack = segments.join(' ').toLowerCase();
  if (!haystack.trim()) return [];

  const results = [];
  Object.entries(crossTagPatterns).forEach(([slug, pattern]) => {
    if (!CROSS_TAG_META.has(slug)) return;
    const score = scorePattern(pattern, haystack);
    if (score <= 0) return;
    const meta = getCrossTagMeta(slug);
    results.push({
      slug,
      name: meta.name,
      group: meta.group,
      confidence: score >= 2 ? 'high' : 'medium',
      match_score: score,
      method: evidenceSources.length ? 'pattern-match+evidence' : 'pattern-match',
    });
  });

  results.sort((a, b) => b.match_score - a.match_score);
  return results;
}

function scorePattern(pattern, haystack) {
  const avoid = pattern.avoid || [];
  for (const term of avoid) {
    if (!term) continue;
    if (haystack.includes(term.toLowerCase())) {
      return 0;
    }
  }

  let score = 0;
  const exacts = pattern.exact || [];
  const synonyms = pattern.synonyms || [];
  const phrases = pattern.phrases || [];

  for (const term of exacts) {
    if (term && haystack.includes(term.toLowerCase())) {
      score += 2;
      break;
    }
  }

  for (const term of synonyms) {
    if (term && haystack.includes(term.toLowerCase())) {
      score += 1;
      break;
    }
  }

  for (const term of phrases) {
    if (term && haystack.includes(term.toLowerCase())) {
      score += 1;
      break;
    }
  }

  if (pattern.confidence_boost) {
    score += pattern.confidence_boost;
  }

  return score;
}

async function assignCrossTags(bookId) {
  console.log(`🏷️  Task 6: Assigning cross-tags for book ${bookId}...`);
  
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  
  // Load domain and enrichment data from previous tasks
  const domainPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let domain = 'fiction'; // default
  let enrichmentData = null;
  if (fs.existsSync(domainPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(domainPath, 'utf8'));
    domain = enrichmentData.taxonomy?.domain?.slug || 'fiction';
  }
  console.log(`  Domain: ${domain}`);
  
  const suggestedTags = suggestCrossTags(book, domain, enrichmentData);
  
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
  let updatedEnrichmentData = {};
  if (fs.existsSync(outputPath)) {
    updatedEnrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  if (!updatedEnrichmentData.taxonomy) updatedEnrichmentData.taxonomy = {};
  updatedEnrichmentData.taxonomy.cross_tags = result.cross_tags;
  updatedEnrichmentData.taxonomy.cross_tags_count = result.count;
  updatedEnrichmentData.last_updated = new Date().toISOString();
  
  fs.writeFileSync(outputPath, JSON.stringify(updatedEnrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-06-cross-tags.js <book_id>');
  process.exit(1);
}

assignCrossTags(bookId).catch(console.error);
