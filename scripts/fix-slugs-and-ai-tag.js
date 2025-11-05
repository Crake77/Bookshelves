// Fix domain slugs, check formats, and fix AI false positives
import pg from 'pg';
import fs from 'fs';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database\n');

  try {
    // 1. Check domains
    console.log('=== Checking Domains ===');
    const domainsResult = await client.query('SELECT slug, name FROM domains ORDER BY slug');
    console.log('Current domains in database:');
    domainsResult.rows.forEach(row => {
      console.log(`  ${row.slug}: ${row.name}`);
    });
    
    // Check if 'nonfiction' exists (should be, not 'non-fiction')
    const nonfictionExists = domainsResult.rows.some(r => r.slug === 'nonfiction');
    console.log(`\n'nonfiction' domain exists: ${nonfictionExists ? 'YES' : 'NO'}`);
    
    // 2. Check formats
    console.log('\n=== Checking Formats ===');
    const formatsToCheck = ['web-novel', 'webtoon', 'light-novel', 'manga', 'manhua', 'manhwa'];
    const formatsResult = await client.query(
      `SELECT slug, name FROM formats WHERE slug = ANY($1::text[]) ORDER BY slug`,
      [formatsToCheck]
    );
    console.log('Formats in database:');
    formatsResult.rows.forEach(row => {
      console.log(`  ✅ ${row.slug}: ${row.name}`);
    });
    
    const existingFormatSlugs = formatsResult.rows.map(r => r.slug);
    const missingFormats = formatsToCheck.filter(f => !existingFormatSlugs.includes(f));
    if (missingFormats.length > 0) {
      console.log(`\n⚠️  Missing formats: ${missingFormats.join(', ')}`);
    }
    
    // 3. Check artificial-intelligence tag pattern
    console.log('\n=== Checking AI Tag Pattern ===');
    const aiPattern = JSON.parse(fs.readFileSync('cross_tag_patterns_v1.json', 'utf8')).patterns['artificial-intelligence'];
    if (aiPattern) {
      console.log('AI pattern exact matches:', aiPattern.exact);
      console.log('AI pattern avoid patterns:', aiPattern.avoid);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);

