import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const ENRICHMENT_DIR = 'enrichment_data';

interface EnrichmentFile {
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

// Fix Ascendance of a Bookworm
const bookwormId = '661d7f73-dc36-4fd7-94c8-5fd6bba9bf16';
let bookworm = loadEnrichment(bookwormId);
bookworm.taxonomy.subgenres = [{ slug: 'light-novel', name: 'Light Novel', confidence: 'high' }];
bookworm.format = { slug: 'light-novel', confidence: 'high', reason: 'Manual correction: Japanese light novel format' };
bookworm.audience = { 
  slug: 'adult',
  confidence: 'high',
  includes: ['young-adult', 'new-adult'],
  reason: 'Manual correction: Appeals to young-adult and new-adult audiences'
};
updateCrossTags(bookworm, ['quest'], [
  { slug: 'female-protag', name: 'Female Protagonist', group: 'character' },
  { slug: 'magic', name: 'Magic', group: 'element' }
]);
saveEnrichment(bookwormId, bookworm);
console.log('✅ Fixed Ascendance of a Bookworm');

// Fix Speaker for the Dead
const speakerId = '6f3452c6-e8c5-4328-941d-4992b401e7fe';
let speaker = loadEnrichment(speakerId);
speaker.taxonomy.subgenres = [{ slug: 'space-opera', name: 'Space Opera', confidence: 'high' }];
updateCrossTags(speaker, [], [
  { slug: 'male-protag', name: 'Male Protagonist', group: 'character' }
]);
saveEnrichment(speakerId, speaker);
console.log('✅ Fixed Speaker for the Dead');

// Fix Ender's Game
const enderId = '13e4fad3-10ac-4d50-92e8-96e52827dec3';
let ender = loadEnrichment(enderId);
ender.taxonomy.subgenres = [{ slug: 'space-opera', name: 'Space Opera', confidence: 'high' }];
updateCrossTags(ender, [], [
  { slug: 'male-protag', name: 'Male Protagonist', group: 'character' },
  { slug: 'juvenile-violence', name: 'Juvenile Violence', group: 'content_warning' }
]);
saveEnrichment(enderId, ender);
console.log('✅ Fixed Ender\'s Game');

// Fix The Eye of the World
const eyeId = '42b1a772-97a1-4777-97cb-ae30b66feab8';
let eye = loadEnrichment(eyeId);
eye.taxonomy.subgenres = [{ slug: 'epic-fantasy', name: 'Epic Fantasy', confidence: 'high' }];
eye.format = { slug: 'novel', confidence: 'high', reason: 'Manual correction: Traditional novel format' };
if (!eye.audience.includes) eye.audience.includes = [];
if (!eye.audience.includes.includes('new-adult')) {
  eye.audience.includes.push('new-adult');
}
updateCrossTags(eye, [], [
  { slug: 'chosen-one', name: 'Chosen One', group: 'trope' },
  { slug: 'prophecy', name: 'Prophecy', group: 'trope' },
  { slug: 'magic', name: 'Magic', group: 'element' },
  { slug: 'male-protag', name: 'Male Protagonist', group: 'character' }
]);
saveEnrichment(eyeId, eye);
console.log('✅ Fixed The Eye of the World');

// Fix Defiance of the Fall
const defianceId = '60eab8a3-98c7-4f63-8b81-208dd9fc8d86';
let defiance = loadEnrichment(defianceId);
defiance.taxonomy.subgenres = [
  { slug: 'cultivation', name: 'Cultivation', confidence: 'high' },
  { slug: 'apocalypse', name: 'Apocalypse', confidence: 'high' }
];
// Add fantasy genre
if (!defiance.taxonomy.genres) defiance.taxonomy.genres = [];
const hasFantasy = defiance.taxonomy.genres.some(g => g.slug === 'fantasy');
if (!hasFantasy) {
  defiance.taxonomy.genres.push({ slug: 'fantasy', name: 'Fantasy', confidence: 'high' });
}
// Add new-adult to audience
if (!defiance.audience.includes) defiance.audience.includes = [];
if (!defiance.audience.includes.includes('new-adult')) {
  defiance.audience.includes.push('new-adult');
}
// Format should support both novel and audiobook
defiance.format = { 
  slug: 'novel',
  also_available_as: ['audiobook'],
  confidence: 'high',
  reason: 'Manual correction: Available as both novel and audiobook'
};
updateCrossTags(defiance, [], [
  { slug: 'litrpg', name: 'LitRPG', group: 'genre_element' },
  { slug: 'cultivation', name: 'Cultivation', group: 'trope' },
  { slug: 'apocalypse', name: 'Apocalypse', group: 'setting' },
  { slug: 'male-protag', name: 'Male Protagonist', group: 'character' }
]);
saveEnrichment(defianceId, defiance);
console.log('✅ Fixed Defiance of the Fall');

// Fix Tower of God
const towerId = '25722ee3-1244-4d3d-bf6b-6d1af5a0e8d1';
let tower = loadEnrichment(towerId);
tower.taxonomy.subgenres = [{ slug: 'webtoon', name: 'Webtoon', confidence: 'high' }];
// Add both genres
if (!tower.taxonomy.genres) tower.taxonomy.genres = [];
const hasSciFi = tower.taxonomy.genres.some(g => g.slug === 'science-fiction');
if (!hasSciFi) {
  tower.taxonomy.genres.push({ slug: 'science-fiction', name: 'Science Fiction', confidence: 'high' });
}
const hasFantasyTower = tower.taxonomy.genres.some(g => g.slug === 'fantasy');
if (!hasFantasyTower) {
  tower.taxonomy.genres.push({ slug: 'fantasy', name: 'Fantasy', confidence: 'high' });
}
tower.format = { slug: 'webtoon', confidence: 'high', reason: 'Manual correction: Webtoon format' };
tower.audience = {
  slug: 'adult',
  includes: ['young-adult', 'new-adult'],
  confidence: 'high',
  reason: 'Manual correction: Appeals to young-adult, new-adult, and adult audiences'
};
saveEnrichment(towerId, tower);
console.log('✅ Fixed Tower of God');

// Fix Dune
const duneId = 'a5630692-6cf1-4d8c-b834-970b18fbabe5';
let dune = loadEnrichment(duneId);
dune.taxonomy.subgenres = [{ slug: 'space-opera', name: 'Space Opera', confidence: 'high' }];
if (!dune.audience.includes) dune.audience.includes = [];
if (!dune.audience.includes.includes('new-adult')) {
  dune.audience.includes.push('new-adult');
}
saveEnrichment(duneId, dune);
console.log('✅ Fixed Dune');

// Fix The Great Hunt
const greatHuntId = 'a22d3173-56b0-4aaf-850e-d594a74741d3';
let greatHunt = loadEnrichment(greatHuntId);
// Remove "dragons" tag if it exists (it's a character name, not actual dragons)
updateCrossTags(greatHunt, ['dragons'], [
  { slug: 'heaven', name: 'Heaven', group: 'setting' },
  { slug: 'abuse', name: 'Abuse', group: 'content_warning' },
  { slug: 'slavery', name: 'Slavery', group: 'content_warning' }
]);
saveEnrichment(greatHuntId, greatHunt);
console.log('✅ Fixed The Great Hunt');

// Fix Path of the Deathless - it was incorrectly labeled as "Delve"
const pathId = 'aafd33c5-f1ee-4da5-ae61-7df49eed6b0f';
let path = loadEnrichment(pathId);
// Update title in input_snapshot
if (path.input_snapshot) {
  path.input_snapshot.title = 'Path of the Deathless';
}
if (path.external_metadata?.input_snapshot) {
  path.external_metadata.input_snapshot.title = 'Path of the Deathless';
}
// This is a different book - it's about Shiv, not Delve
// Need to update summary and tags appropriately
// Based on Royal Road: LitRPG, Post-Apocalyptic, Anti-Hero, Progression
path.taxonomy.subgenres = [
  { slug: 'litrpg', name: 'LitRPG', confidence: 'high' },
  { slug: 'apocalypse', name: 'Apocalypse', confidence: 'high' }
];
updateCrossTags(path, [], [
  { slug: 'litrpg', name: 'LitRPG', group: 'genre_element' },
  { slug: 'post-apocalyptic', name: 'Post-Apocalyptic', group: 'setting' },
  { slug: 'anti-hero', name: 'Anti-Hero', group: 'character' },
  { slug: 'progression', name: 'Progression', group: 'trope' },
  { slug: 'male-protag', name: 'Male Protagonist', group: 'character' }
]);
saveEnrichment(pathId, path);
console.log('✅ Fixed Path of the Deathless (corrected from Delve)');

console.log('\n✅ All Batch 002 enrichment files fixed!');
console.log('Next: Regenerate SQL and re-apply to database');

