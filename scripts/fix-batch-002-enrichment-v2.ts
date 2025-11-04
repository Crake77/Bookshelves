import 'dotenv/config';
import fs from 'node:fs';

const ENRICHMENT_DIR = 'enrichment_data';

interface EnrichmentFile {
  input_snapshot?: any;
  external_metadata?: any;
  taxonomy?: {
    subgenres?: Array<{ slug: string; name?: string; confidence?: string }>;
    genres?: Array<{ slug: string; name?: string; confidence?: string }>;
    cross_tags?: Array<{ slug: string; [key: string]: any }>;
    [key: string]: any;
  };
  format?: { slug: string; [key: string]: any };
  audience?: { slug: string; [key: string]: any };
  [key: string]: any;
}

function loadEnrichment(bookId: string): EnrichmentFile {
  const filePath = `${ENRICHMENT_DIR}/${bookId}.json`;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveEnrichment(bookId: string, data: EnrichmentFile) {
  const filePath = `${ENRICHMENT_DIR}/${bookId}.json`;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function updateCrossTags(data: EnrichmentFile, removeSlugs: string[], addTags: Array<{ slug: string; name: string; group: string; confidence?: string }>) {
  if (!data.taxonomy) data.taxonomy = {};
  if (!data.taxonomy.cross_tags) data.taxonomy.cross_tags = [];
  
  // Remove tags
  data.taxonomy.cross_tags = data.taxonomy.cross_tags.filter(tag => !removeSlugs.includes(tag.slug));
  
  // Add new tags (avoid duplicates)
  const existingSlugs = new Set(data.taxonomy.cross_tags.map(t => t.slug));
  for (const tag of addTags) {
    if (!existingSlugs.has(tag.slug)) {
      data.taxonomy.cross_tags.push({
        slug: tag.slug,
        name: tag.name,
        group: tag.group,
        confidence: tag.confidence || 'high',
        method: 'manual-fix'
      });
    }
  }
  
  data.taxonomy.cross_tags_count = data.taxonomy.cross_tags.length;
}

// Fix Ascendance of a Bookworm - light-novel is a format, not subgenre
const bookwormId = '661d7f73-dc36-4fd7-94c8-5fd6bba9bf16';
let bookworm = loadEnrichment(bookwormId);
bookworm.taxonomy.subgenres = [{ slug: 'isekai', name: 'Isekai', confidence: 'high' }]; // Use isekai as subgenre
bookworm.format = { slug: 'light-novel', confidence: 'high', reason: 'Manual correction: Japanese light novel format' };
bookworm.audience = { 
  slug: 'adult',
  confidence: 'high',
  includes: ['young-adult', 'new-adult'],
  reason: 'Manual correction: Appeals to young-adult and new-adult audiences'
};
updateCrossTags(bookworm, ['quest'], [
  { slug: 'female-protag', name: 'Female Protagonist', group: 'character' },
  { slug: 'magic', name: 'Magic', group: 'element' },
  { slug: 'reincarnation', name: 'Reincarnation', group: 'trope' },
  { slug: 'slice-of-life', name: 'Slice of Life', group: 'trope' },
  { slug: 'crafting', name: 'Crafting', group: 'trope' },
  { slug: 'medieval-setting', name: 'Medieval Setting', group: 'setting' }
]);
saveEnrichment(bookwormId, bookworm);
console.log('✅ Fixed Ascendance of a Bookworm');

// Fix Path of the Deathless - correct title and format
const pathId = 'aafd33c5-f1ee-4da5-ae61-7df49eed6b0f';
let path = loadEnrichment(pathId);
// Update title
if (path.input_snapshot) {
  path.input_snapshot.title = 'Path of the Deathless';
}
if (path.external_metadata?.input_snapshot) {
  path.external_metadata.input_snapshot.title = 'Path of the Deathless';
}
// This is a web novel, not a traditional book
path.taxonomy.subgenres = [
  { slug: 'web-novel', name: 'Web Novel', confidence: 'high' },
  { slug: 'post-apocalyptic', name: 'Post-Apocalyptic', confidence: 'high' }
];
path.format = { slug: 'web-novel', confidence: 'high', reason: 'Manual correction: Royal Road web novel' };
updateCrossTags(path, [], [
  { slug: 'litrpg', name: 'LitRPG', group: 'genre_element' },
  { slug: 'post-apocalyptic', name: 'Post-Apocalyptic', group: 'setting' },
  { slug: 'anti-hero', name: 'Anti-Hero', group: 'character' },
  { slug: 'progression', name: 'Progression', group: 'trope' },
  { slug: 'male-protag', name: 'Male Protagonist', group: 'character' },
  { slug: 'death', name: 'Death', group: 'trope' },
  { slug: 'resurrection', name: 'Resurrection', group: 'trope' },
  { slug: 'system', name: 'System', group: 'element' }
]);
saveEnrichment(pathId, path);
console.log('✅ Fixed Path of the Deathless (corrected title and format)');

// Add more cross-tags to books that need them
const eyeId = '42b1a772-97a1-4777-97cb-ae30b66feab8';
let eye = loadEnrichment(eyeId);
updateCrossTags(eye, [], [
  { slug: 'epic-fantasy', name: 'Epic Fantasy', group: 'genre_element' },
  { slug: 'medieval-setting', name: 'Medieval Setting', group: 'setting' },
  { slug: 'quest', name: 'Quest', group: 'trope' },
  { slug: 'adventure', name: 'Adventure', group: 'trope' },
  { slug: 'coming-of-age', name: 'Coming of Age', group: 'trope' }
]);
saveEnrichment(eyeId, eye);
console.log('✅ Added more tags to The Eye of the World');

const speakerId = '6f3452c6-e8c5-4328-941d-4992b401e7fe';
let speaker = loadEnrichment(speakerId);
updateCrossTags(speaker, [], [
  { slug: 'aliens', name: 'Aliens', group: 'element' },
  { slug: 'first-contact', name: 'First Contact', group: 'trope' },
  { slug: 'cultural-misunderstanding', name: 'Cultural Misunderstanding', group: 'trope' },
  { slug: 'redemption', name: 'Redemption', group: 'trope' },
  { slug: 'moral-complexity', name: 'Moral Complexity', group: 'trope' }
]);
saveEnrichment(speakerId, speaker);
console.log('✅ Added more tags to Speaker for the Dead');

const towerId = '25722ee3-1244-4d3d-bf6b-6d1af5a0e8d1';
let tower = loadEnrichment(towerId);
updateCrossTags(tower, [], [
  { slug: 'tower-climbing', name: 'Tower Climbing', group: 'trope' },
  { slug: 'tests', name: 'Tests', group: 'trope' },
  { slug: 'friendship', name: 'Friendship', group: 'trope' }
]);
saveEnrichment(towerId, tower);
console.log('✅ Added more tags to Tower of God');

const duneId = 'a5630692-6cf1-4d8c-b834-970b18fbabe5';
let dune = loadEnrichment(duneId);
updateCrossTags(dune, [], [
  { slug: 'political-intrigue', name: 'Political Intrigue', group: 'trope' },
  { slug: 'religion', name: 'Religion', group: 'element' },
  { slug: 'ecology', name: 'Ecology', group: 'element' },
  { slug: 'desert-setting', name: 'Desert Setting', group: 'setting' }
]);
saveEnrichment(duneId, dune);
console.log('✅ Added more tags to Dune');

console.log('\n✅ All fixes applied!');
console.log('Note: Some subgenres may need to be verified against database taxonomy');

