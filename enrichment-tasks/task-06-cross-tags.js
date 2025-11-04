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

// Slug alias mapping: pattern slugs that don't match taxonomy slugs
const SLUG_ALIASES = new Map([
  ['strong-female-lead', 'female-protagonist'], // Pattern uses different slug than taxonomy
]);

function resolveSlug(patternSlug) {
  return SLUG_ALIASES.get(patternSlug) || patternSlug;
}

// Semantic inference: Detect protagonist gender from pronouns and narrative context
function detectProtagonistGender(book, enrichmentData) {
  const text = [
    book.description || '',
    book.title || '',
    enrichmentData?.summary?.new_summary || ''
  ].join(' ').toLowerCase();
  
  if (!text.trim()) return null;
  
  // Count pronouns referring to protagonist
  const malePronouns = (text.match(/\b(he|him|his)\b/g) || []).length;
  const femalePronouns = (text.match(/\b(she|her|hers)\b/g) || []).length;
  
  // Check for explicit protagonist mentions
  const hasMaleProtagonist = /\b(male protagonist|male lead|male hero|he is|he was|he has|he discovers|he finds|he journeys|he travels|his journey|his quest|his story)\b/i.test(text);
  const hasFemaleProtagonist = /\b(female protagonist|female lead|female hero|she is|she was|she has|she discovers|she finds|she journeys|she travels|her journey|her quest|her story)\b/i.test(text);
  
  // Strong indicators: explicit mentions
  if (hasFemaleProtagonist && !hasMaleProtagonist) {
    return 'female-protagonist';
  }
  if (hasMaleProtagonist && !hasFemaleProtagonist) {
    return 'male-protagonist';
  }
  
  // Moderate indicators: pronoun frequency (need at least 2 occurrences to avoid false positives)
  if (femalePronouns >= 2 && femalePronouns > malePronouns * 1.5) {
    return 'female-protagonist';
  }
  if (malePronouns >= 2 && malePronouns > femalePronouns * 1.5) {
    return 'male-protagonist';
  }
  
  return null;
}

// Semantic inference: Detect content warnings from semantic variations
function detectContentWarnings(book, enrichmentData) {
  // Strip HTML tags and normalize whitespace
  const cleanText = (str) => (str || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const text = [
    cleanText(book.description),
    cleanText(enrichmentData?.summary?.new_summary)
  ].join(' ').toLowerCase();
  
  if (!text.trim()) return [];
  
  const warnings = [];
  
  // Slavery detection: semantic variations -> "slavery" tag (content_flags group)
  const slaveryIndicators = [
    /\benslaved\b/i,
    /\bforced servitude\b/i,
    /\bbondage\b/i,
    /\bcaptivity\b/i,
    /\bchains\b/i,
    /\bowned by\b/i,
    /\bslaves\b/i,
    /\bslavery\b/i,
    /\benslavement\b/i
  ];
  if (slaveryIndicators.some(pattern => pattern.test(text)) && CROSS_TAG_META.has('slavery')) {
    warnings.push('slavery');
  }
  
  // Child soldiers detection: semantic variations -> "child-soldiers" tag (discrete content flag)
  // Check for explicit mentions
  const hasExplicitChildSoldiers = /\bchild soldiers?\b/i.test(text);
  const hasChildrenFighting = /\bchildren fighting\b/i.test(text);
  const hasTeenagersAtWar = /\bteenagers? at war\b/i.test(text);
  const hasChildrenAtWar = /\bchildren? at war\b/i.test(text);
  const hasChildrenKilling = /\bchildren? killing\b/i.test(text);
  const hasChildrenInCombat = /\bchildren? in combat\b/i.test(text);
  const hasMinorsFighting = /\bminors fighting\b/i.test(text);
  
  // Check for contextual patterns (child + training + military/war/soldier)
  // Simplified and more reliable patterns
  
  // Pattern 1: "breed child geniuses" + "train" + "soldier" (key phrase from Ender's Game)
  const hasBreedChildGeniuses = /\bbreed.*child.*geniuses?\b/i.test(text);
  const hasTrainSoldier = /\b(train|trained|training).*soldier/i.test(text);
  const hasBreedChildGeniusesTrain = hasBreedChildGeniuses && hasTrainSoldier;
  
  // Pattern 2: "young boy" + "recruitment" + "war"
  const hasYoungBoyRecruitment = /\b(young boy|young girl|child|children).*recruitment.*war/i.test(text);
  
  // Pattern 3: "child geniuses" + "train" + "soldier" (any order in text)
  const hasChildGeniuses = /\b(child geniuses?|geniuses)\b/i.test(text);
  const hasTrain = /\b(train|trained|training)\b/i.test(text);
  const hasSoldier = /\b(soldier|soldiers)\b/i.test(text);
  const hasChildGeniusesTrain = hasChildGeniuses && hasTrain && hasSoldier;
  
  // Pattern 4: "breed" + "child" + "soldier" (any order)
  const hasBreed = /\bbreed\b/i.test(text);
  const hasChild = /\b(child|children|geniuses)\b/i.test(text);
  const hasBreedChildSoldier = hasBreed && hasChild && hasSoldier;
  
  // Pattern 5: "young soldiers" (exact phrase)
  const hasYoungSoldiers = /\byoung soldiers?\b/i.test(text);
  
  // Pattern 6: "children" + ("battle" or "war" or "soldier")
  const hasChildrenInBattle = /\b(children|child|young).*(battle|war|combat|soldier)/i.test(text);
  
  // Pattern 7: "soldier-training program" + child context
  const hasSoldierTrainingProgram = /\bsoldier.*training.*program\b/i.test(text) &&
                                    /\b(child|children|young|geniuses)\b/i.test(text);
  
  if (hasExplicitChildSoldiers || hasChildrenFighting || hasTeenagersAtWar || 
      hasChildrenAtWar || hasChildrenKilling || hasChildrenInCombat || hasMinorsFighting ||
      hasBreedChildGeniusesTrain || hasYoungBoyRecruitment || hasChildGeniusesTrain || 
      hasBreedChildSoldier || hasYoungSoldiers || hasChildrenInBattle || 
      hasSoldierTrainingProgram) {
    // Use child-soldiers tag (now exists in taxonomy)
    if (CROSS_TAG_META.has('child-soldiers')) {
      warnings.push('child-soldiers');
    } else if (CROSS_TAG_META.has('violence')) {
      // Fallback to violence if child-soldiers not yet in DB
      warnings.push('violence');
    }
  }
  
  // General violence detection (if not already added via child soldiers)
  const violenceIndicators = [
    /\bgraphic violence\b/i,
    /\bviolent\b/i,
    /\bbrutal\b/i,
    /\bbloody\b/i,
    /\bgore\b/i
  ];
  if (violenceIndicators.some(pattern => pattern.test(text)) && !warnings.includes('violence')) {
    if (CROSS_TAG_META.has('violence')) {
      warnings.push('violence');
    }
  }
  
  return warnings;
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
  
  // Add semantic inference for character traits
  const protagonistGender = detectProtagonistGender(book, enrichmentData);
  if (protagonistGender && CROSS_TAG_META.has(protagonistGender)) {
    const existingSlug = tags.find(t => t.slug === protagonistGender);
    if (!existingSlug) {
      const meta = getCrossTagMeta(protagonistGender);
      tags.push({
        slug: protagonistGender,
        name: meta.name,
        group: meta.group,
        confidence: 'high',
        match_score: 5,
        method: 'semantic-inference',
      });
    }
  }
  
  // Add semantic inference for content warnings
  const contentWarnings = detectContentWarnings(book, enrichmentData);
  contentWarnings.forEach(warningSlug => {
    if (CROSS_TAG_META.has(warningSlug)) {
      const existingSlug = tags.find(t => t.slug === warningSlug);
      if (!existingSlug) {
        const meta = getCrossTagMeta(warningSlug);
        tags.push({
          slug: warningSlug,
          name: meta.name,
          group: meta.group,
          confidence: 'high',
          match_score: 4,
          method: 'semantic-inference',
        });
      }
    }
  });
  
  // Sort by match score
  tags.sort((a, b) => b.match_score - a.match_score);
  
  // Generate pattern tags and merge with direct matches (not just fill gaps)
  const patternMatches = generatePatternTags(book, enrichmentData, evidenceSources);
  const existingSlugs = new Set(tags.map((tag) => tag.slug));
  
  // Merge pattern results: combine scores if tag exists, add if new
  patternMatches.forEach(patternMatch => {
    const resolvedSlug = resolveSlug(patternMatch.slug);
    if (!CROSS_TAG_META.has(resolvedSlug)) return; // Skip if slug doesn't exist in taxonomy
    
    const existing = tags.find(t => t.slug === resolvedSlug);
    if (existing) {
      // Combine scores: pattern matching supplements direct matching
      existing.match_score = Math.max(existing.match_score, patternMatch.match_score * 0.8); // Slight penalty for pattern-only
      if (patternMatch.confidence === 'high' && existing.confidence === 'medium') {
        existing.confidence = 'high';
      }
      existing.method = existing.method === 'semantic-inference' 
        ? 'semantic-inference+pattern' 
        : (existing.method.includes('pattern') ? existing.method : `${existing.method}+pattern`);
    } else {
      // Add new tag from pattern
      tags.push({
        ...patternMatch,
        slug: resolvedSlug,
      });
    }
  });
  
  // Re-sort after merging
  tags.sort((a, b) => b.match_score - a.match_score);

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
  Object.entries(crossTagPatterns).forEach(([patternSlug, pattern]) => {
    // Resolve slug alias (e.g., strong-female-lead -> female-protagonist)
    const resolvedSlug = resolveSlug(patternSlug);
    if (!CROSS_TAG_META.has(resolvedSlug)) return;
    
    const score = scorePattern(pattern, haystack);
    if (score <= 0) return;
    
    const meta = getCrossTagMeta(resolvedSlug);
    results.push({
      slug: resolvedSlug, // Use resolved slug, not pattern slug
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
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchesTerm = (term) => {
    if (!term) return false;
    const escaped = escapeRegex(term.toLowerCase());
    const boundaryPattern = new RegExp(`\\b${escaped}\\b`, 'i');
    return boundaryPattern.test(haystack);
  };

  const avoid = pattern.avoid || [];
  for (const term of avoid) {
    if (matchesTerm(term)) {
      return 0;
    }
  }

  let score = 0;
  const exacts = pattern.exact || [];
  const synonyms = pattern.synonyms || [];
  const phrases = pattern.phrases || [];

  for (const term of exacts) {
    if (matchesTerm(term)) {
      score += 2;
      break;
    }
  }

  for (const term of synonyms) {
    if (matchesTerm(term)) {
      score += 1;
      break;
    }
  }

  for (const term of phrases) {
    if (matchesTerm(term)) {
      score += 1;
      break;
    }
  }

  if (score > 0 && pattern.confidence_boost) {
    score += pattern.confidence_boost;
  }

  return score;
}

async function assignCrossTags(bookId) {
  console.log(`🏷️  Task 6: Assigning cross-tags for book ${bookId}...`);
  
  // Load book from appropriate batch file
  const { loadBookFromBatch } = await import('./helpers.js');
  const book = loadBookFromBatch(bookId);
  
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
