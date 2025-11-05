// Generate patterns for all missing cross-tags
// Usage: node scripts/generate-missing-cross-tag-patterns.js

import fs from 'fs';
import path from 'path';

const TAXONOMY_FILE = 'bookshelves_complete_taxonomy.json';
const PATTERNS_FILE = 'cross_tag_patterns_v1.json';

// Load taxonomy and existing patterns
const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_FILE, 'utf8'));
const existingPatterns = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));

// Get all existing pattern slugs
const existingSlugs = new Set(Object.keys(existingPatterns.patterns || {}));

// Collect all tags from taxonomy
const allTags = [];
Object.keys(taxonomy.cross_tags.by_group).forEach(group => {
  taxonomy.cross_tags.by_group[group].forEach(tag => {
    allTags.push({
      slug: tag.slug,
      name: tag.name,
      group: group,
      description: tag.description || null
    });
  });
});

// Find missing tags
const missingTags = allTags.filter(tag => !existingSlugs.has(tag.slug));

console.log(`Total tags: ${allTags.length}`);
console.log(`Existing patterns: ${existingSlugs.size}`);
console.log(`Missing patterns: ${missingTags.length}`);

// Generate pattern for a tag
function generatePattern(tag) {
  const slug = tag.slug;
  const name = tag.name;
  const group = tag.group;
  const description = tag.description || '';
  
  // Generate exact phrases from name
  const exact = [];
  exact.push(name.toLowerCase());
  exact.push(slug.replace(/-/g, ' '));
  
  // Add variations
  if (name.includes(' ')) {
    exact.push(name.toLowerCase());
  }
  
  // Generate synonyms based on common patterns
  const synonyms = [];
  const slugWords = slug.split('-');
  
  // Common synonym patterns
  if (slug.includes('-rep')) {
    synonyms.push(slug.replace('-rep', ' representation'));
    synonyms.push(slug.replace('-rep', ' representation').replace(/-/g, ' '));
  }
  if (slug.includes('-mc')) {
    synonyms.push(slug.replace('-mc', ' main character'));
    synonyms.push(slug.replace('-mc', ' main character').replace(/-/g, ' '));
  }
  if (slug.includes('-lead')) {
    synonyms.push(slug.replace('-lead', ' lead'));
  }
  if (slug.includes('-protagonist')) {
    synonyms.push(slug.replace('-protagonist', ' protagonist'));
  }
  
  // Generate contextual phrases
  const phrases = [];
  
  // Group-specific phrase generation
  if (group === 'trope') {
    phrases.push(`features ${name.toLowerCase()}`);
    phrases.push(`with ${name.toLowerCase()}`);
    phrases.push(`${name.toLowerCase()} trope`);
    phrases.push(`${name.toLowerCase()} element`);
  } else if (group === 'representation') {
    phrases.push(`${name.toLowerCase()} representation`);
    phrases.push(`features ${name.toLowerCase()}`);
    phrases.push(`includes ${name.toLowerCase()}`);
    phrases.push(`represents ${name.toLowerCase()}`);
  } else if (group === 'plot') {
    phrases.push(`plot features ${name.toLowerCase()}`);
    phrases.push(`story involves ${name.toLowerCase()}`);
    phrases.push(`narrative includes ${name.toLowerCase()}`);
  } else if (group === 'tone' || group === 'tone_mood') {
    phrases.push(`${name.toLowerCase()} tone`);
    phrases.push(`${name.toLowerCase()} mood`);
    phrases.push(`has a ${name.toLowerCase()} atmosphere`);
    phrases.push(`feels ${name.toLowerCase()}`);
  } else if (group === 'content_warning' || group === 'content_flags') {
    phrases.push(`contains ${name.toLowerCase()}`);
    phrases.push(`includes ${name.toLowerCase()}`);
    phrases.push(`features ${name.toLowerCase()}`);
    phrases.push(`warnings: ${name.toLowerCase()}`);
    phrases.push(`content warning: ${name.toLowerCase()}`);
  } else if (group === 'style') {
    phrases.push(`${name.toLowerCase()} style`);
    phrases.push(`written in ${name.toLowerCase()} style`);
    phrases.push(`${name.toLowerCase()} writing`);
  } else if (group === 'setting') {
    phrases.push(`set in ${name.toLowerCase()}`);
    phrases.push(`takes place in ${name.toLowerCase()}`);
    phrases.push(`${name.toLowerCase()} setting`);
    phrases.push(`${name.toLowerCase()} location`);
  } else if (group === 'theme') {
    phrases.push(`theme of ${name.toLowerCase()}`);
    phrases.push(`explores ${name.toLowerCase()}`);
    phrases.push(`themes of ${name.toLowerCase()}`);
  } else {
    // Generic phrases
    phrases.push(`features ${name.toLowerCase()}`);
    phrases.push(`includes ${name.toLowerCase()}`);
    phrases.push(`with ${name.toLowerCase()}`);
  }
  
  // Generate avoid patterns (common false positives)
  const avoid = [];
  
  // Avoid patterns for common false positives
  if (slug.includes('fiction') && group !== 'structure') {
    avoid.push('non-fiction');
  }
  if (slug.includes('novel') && group !== 'structure') {
    avoid.push('graphic novel');
    avoid.push('light novel');
  }
  if (slug.includes('fantasy') && group !== 'trope') {
    avoid.push('fantasy genre');
  }
  if (slug.includes('science') && group !== 'trope') {
    avoid.push('science fiction');
    avoid.push('science fiction genre');
  }
  if (slug.includes('mystery') && group !== 'trope') {
    avoid.push('mystery genre');
  }
  if (slug.includes('romance') && group !== 'trope') {
    avoid.push('romance genre');
  }
  
  // Confidence boost based on group
  let confidenceBoost = 0.1;
  if (group === 'content_warning' || group === 'content_flags') {
    confidenceBoost = 0.15; // Content warnings are important
  } else if (group === 'representation') {
    confidenceBoost = 0.15; // Representation tags are important
  } else if (group === 'trope') {
    confidenceBoost = 0.1; // Standard for tropes
  } else if (group === 'tone' || group === 'tone_mood') {
    confidenceBoost = 0.12; // Tone is somewhat subjective
  }
  
  // Generate notes
  const notes = `${group}: ${name}`;
  
  return {
    exact: exact.filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
    synonyms: synonyms.filter((v, i, a) => a.indexOf(v) === i),
    phrases: phrases.filter((v, i, a) => a.indexOf(v) === i),
    avoid: avoid.filter((v, i, a) => a.indexOf(v) === i),
    confidence_boost: confidenceBoost,
    notes: notes
  };
}

// Generate patterns for all missing tags
console.log('\nGenerating patterns for missing tags...');
const newPatterns = {};

missingTags.forEach((tag, index) => {
  if ((index + 1) % 100 === 0) {
    console.log(`  Generated ${index + 1}/${missingTags.length} patterns...`);
  }
  newPatterns[tag.slug] = generatePattern(tag);
});

console.log(`\nGenerated ${Object.keys(newPatterns).length} new patterns`);

// Merge with existing patterns
const mergedPatterns = {
  ...existingPatterns.patterns,
  ...newPatterns
};

// Update metadata
const output = {
  metadata: {
    ...existingPatterns.metadata,
    total_patterns: Object.keys(mergedPatterns).length,
    generated_date: new Date().toISOString().split('T')[0],
    version: '2.0.0',
    coverage_note: `Complete coverage: all ${allTags.length} cross-tags have pattern definitions`
  },
  patterns: mergedPatterns
};

// Write output
const outputFile = 'cross_tag_patterns_v1.json';
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

console.log(`\n✅ Updated ${outputFile}`);
console.log(`   Total patterns: ${Object.keys(mergedPatterns).length}`);
console.log(`   Coverage: ${((Object.keys(mergedPatterns).length / allTags.length) * 100).toFixed(1)}%`);

// Summary by group
console.log('\n📊 Summary by group:');
const groupCounts = {};
missingTags.forEach(tag => {
  groupCounts[tag.group] = (groupCounts[tag.group] || 0) + 1;
});
Object.keys(groupCounts).sort().forEach(group => {
  console.log(`   ${group}: ${groupCounts[group]} patterns generated`);
});

