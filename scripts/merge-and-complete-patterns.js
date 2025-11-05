// Merge batch files and generate patterns for missing tags only
// Usage: node scripts/merge-and-complete-patterns.js

import fs from 'fs';

const TAXONOMY_FILE = 'bookshelves_complete_taxonomy.json';
const PATTERNS_FILE = 'cross_tag_patterns_v1.json';
const BATCH_FILES = [
  'cross_tag_patterns.json',
  'cross_tag_patterns_batch_02.json',
  'cross_tag_patterns_batch_03.json',
  'cross_tag_patterns_batch_04.json',
  'cross_tag_patterns_batch_05.json',
  'cross_tag_patterns_batch_06.json',
  'cross_tag_patterns_batch_07.json'
];

// Load taxonomy
const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_FILE, 'utf8'));

// Merge all batch files
const mergedPatterns = {};
console.log('Merging batch files...');
for (const batchFile of BATCH_FILES) {
  if (!fs.existsSync(batchFile)) {
    console.warn(`  ⚠️  ${batchFile} not found, skipping`);
    continue;
  }
  const batchData = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
  if (batchData.patterns) {
    const count = Object.keys(batchData.patterns).length;
    console.log(`  ✓ ${batchFile}: ${count} patterns`);
    Object.assign(mergedPatterns, batchData.patterns);
  }
}

console.log(`\nTotal patterns from batch files: ${Object.keys(mergedPatterns).length}`);

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
const existingSlugs = new Set(Object.keys(mergedPatterns));
const missingTags = allTags.filter(tag => !existingSlugs.has(tag.slug));

console.log(`Total tags in taxonomy: ${allTags.length}`);
console.log(`Existing patterns: ${existingSlugs.size}`);
console.log(`Missing patterns: ${missingTags.length}`);

if (missingTags.length === 0) {
  console.log('\n✅ All tags already have patterns!');
  process.exit(0);
}

// Generate pattern for a missing tag (same function as before)
function generatePattern(tag) {
  const slug = tag.slug;
  const name = tag.name;
  const group = tag.group;
  
  const exact = [];
  exact.push(name.toLowerCase());
  exact.push(slug.replace(/-/g, ' '));
  
  if (name.includes(' ')) {
    exact.push(name.toLowerCase());
  }
  
  const synonyms = [];
  const slugWords = slug.split('-');
  
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
  
  const phrases = [];
  
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
    phrases.push(`features ${name.toLowerCase()}`);
    phrases.push(`includes ${name.toLowerCase()}`);
    phrases.push(`with ${name.toLowerCase()}`);
  }
  
  const avoid = [];
  
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
  
  let confidenceBoost = 0.1;
  if (group === 'content_warning' || group === 'content_flags') {
    confidenceBoost = 0.15;
  } else if (group === 'representation') {
    confidenceBoost = 0.15;
  } else if (group === 'trope') {
    confidenceBoost = 0.1;
  } else if (group === 'tone' || group === 'tone_mood') {
    confidenceBoost = 0.12;
  }
  
  const notes = `${group}: ${name}`;
  
  return {
    exact: [...new Set(exact)],
    synonyms: [...new Set(synonyms)],
    phrases: [...new Set(phrases)],
    avoid: [...new Set(avoid)],
    confidence_boost: confidenceBoost,
    notes: notes
  };
}

// Generate patterns for missing tags
console.log(`\nGenerating patterns for ${missingTags.length} missing tags...`);
const newPatterns = {};

missingTags.forEach((tag, index) => {
  if ((index + 1) % 100 === 0) {
    console.log(`  Generated ${index + 1}/${missingTags.length} patterns...`);
  }
  newPatterns[tag.slug] = generatePattern(tag);
});

console.log(`Generated ${Object.keys(newPatterns).length} new patterns`);

// Merge with existing patterns (preserve existing ones)
const finalPatterns = {
  ...mergedPatterns,
  ...newPatterns
};

// Update metadata
const output = {
  metadata: {
    batches_merged: BATCH_FILES.length,
    total_patterns: Object.keys(finalPatterns).length,
    manually_created: Object.keys(mergedPatterns).length,
    auto_generated: Object.keys(newPatterns).length,
    coverage_note: `Complete coverage: ${Object.keys(finalPatterns).length} patterns (${Object.keys(mergedPatterns).length} manual + ${Object.keys(newPatterns).length} auto-generated) covering all ${allTags.length} cross-tags`,
    version: '2.0.0',
    generated_date: new Date().toISOString().split('T')[0]
  },
  patterns: finalPatterns
};

// Write output
fs.writeFileSync(PATTERNS_FILE, JSON.stringify(output, null, 2));

console.log(`\n✅ Updated ${PATTERNS_FILE}`);
console.log(`   Total patterns: ${Object.keys(finalPatterns).length}`);
console.log(`   Manual patterns: ${Object.keys(mergedPatterns).length}`);
console.log(`   Auto-generated: ${Object.keys(newPatterns).length}`);
console.log(`   Coverage: ${((Object.keys(finalPatterns).length / allTags.length) * 100).toFixed(1)}%`);

// Summary by group
console.log('\n📊 Summary by group for new patterns:');
const groupCounts = {};
missingTags.forEach(tag => {
  groupCounts[tag.group] = (groupCounts[tag.group] || 0) + 1;
});
Object.keys(groupCounts).sort().forEach(group => {
  console.log(`   ${group}: ${groupCounts[group]} patterns generated`);
});

