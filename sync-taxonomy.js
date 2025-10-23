// Taxonomy Sync Script
// Ensures all taxonomy items from bookshelves_complete_taxonomy.json exist in the database
// Safe to run multiple times (idempotent) - only inserts missing items

import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

console.log('🔄 Starting taxonomy sync...\n');

let stats = {
  supergenres: { existing: 0, inserted: 0 },
  genres: { existing: 0, inserted: 0 },
  subgenres: { existing: 0, inserted: 0 },
  cross_tags: { existing: 0, inserted: 0 }
};

// Sync Supergenres
console.log('\n📊 Syncing supergenres...');
for (const sg of taxonomy.supergenres) {
  const existing = await client.query('SELECT id FROM supergenres WHERE slug = $1', [sg.slug]);
  if (existing.rows.length === 0) {
    await client.query(
      'INSERT INTO supergenres (slug, name, description) VALUES ($1, $2, $3)',
      [sg.slug, sg.name, sg.description || null]
    );
    console.log(`  ✅ Inserted: ${sg.name}`);
    stats.supergenres.inserted++;
  } else {
    stats.supergenres.existing++;
  }
}

// Sync Genres
console.log('\n📊 Syncing genres...');
for (const genre of taxonomy.genres) {
  const existing = await client.query('SELECT id FROM genres WHERE slug = $1', [genre.slug]);
  if (existing.rows.length === 0) {
    await client.query(
      'INSERT INTO genres (slug, name, description) VALUES ($1, $2, $3)',
      [genre.slug, genre.name, genre.description || null]
    );
    console.log(`  ✅ Inserted: ${genre.name}`);
    stats.genres.inserted++;
  } else {
    stats.genres.existing++;
  }
}

// Sync Subgenres
console.log('\n📊 Syncing subgenres...');
for (const subgenre of taxonomy.subgenres) {
  const existing = await client.query('SELECT id FROM subgenres WHERE slug = $1', [subgenre.slug]);
  if (existing.rows.length === 0) {
    // Get parent genre_id
    const genreResult = await client.query('SELECT id FROM genres WHERE slug = $1', [subgenre.genre_slug]);
    if (genreResult.rows.length === 0) {
      console.log(`  ⚠️  Skipping ${subgenre.name} - parent genre ${subgenre.genre_slug} not found`);
      continue;
    }
    const genreId = genreResult.rows[0].id;
    
    await client.query(
      'INSERT INTO subgenres (slug, name, description, genre_id) VALUES ($1, $2, $3, $4)',
      [subgenre.slug, subgenre.name, subgenre.description || null, genreId]
    );
    console.log(`  ✅ Inserted: ${subgenre.name} (${subgenre.genre_slug})`);
    stats.subgenres.inserted++;
  } else {
    stats.subgenres.existing++;
  }
}

// Sync Cross-Tags
console.log('\n📊 Syncing cross-tags...');
const crossTagsFlat = [];
Object.keys(taxonomy.cross_tags.by_group).forEach(group => {
  taxonomy.cross_tags.by_group[group].forEach(tag => {
    crossTagsFlat.push({ ...tag, group });
  });
});

for (const tag of crossTagsFlat) {
  const existing = await client.query('SELECT id FROM cross_tags WHERE slug = $1', [tag.slug]);
  if (existing.rows.length === 0) {
    await client.query(
      'INSERT INTO cross_tags (slug, name, description, "group") VALUES ($1, $2, $3, $4)',
      [tag.slug, tag.name, tag.description || null, tag.group]
    );
    console.log(`  ✅ Inserted: ${tag.name} [${tag.group}]`);
    stats.cross_tags.inserted++;
  } else {
    stats.cross_tags.existing++;
  }
}

await client.end();

await client.end();

// Print summary
console.log('\n✅ Taxonomy sync complete!\n');
console.log('📊 Summary:');
console.log(`   Supergenres: ${stats.supergenres.inserted} inserted, ${stats.supergenres.existing} existing`);
console.log(`   Genres: ${stats.genres.inserted} inserted, ${stats.genres.existing} existing`);
console.log(`   Subgenres: ${stats.subgenres.inserted} inserted, ${stats.subgenres.existing} existing`);
console.log(`   Cross-tags: ${stats.cross_tags.inserted} inserted, ${stats.cross_tags.existing} existing`);

const totalInserted = Object.values(stats).reduce((sum, cat) => sum + cat.inserted, 0);
console.log(`\n   Total: ${totalInserted} new items added to database`);
