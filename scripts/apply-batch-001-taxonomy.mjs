import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to database\n');

  try {
    console.log('=== STEP 1: Seed Taxonomy Tables ===\n');
    
    // Check if taxonomy is already seeded
    const genresCheck = await client.query('SELECT COUNT(*) FROM genres');
    if (genresCheck.rows[0].count > 0) {
      console.log(`✓ Taxonomy already seeded (${genresCheck.rows[0].count} genres found)`);
    } else {
      console.log('⚠ Taxonomy tables are empty - need to seed first!');
      console.log('\nPlease run the taxonomy seed script first:');
      console.log('  node scripts/seed-taxonomy.ts');
      console.log('\nThis will populate:');
      console.log('  - domains, supergenres, genres, subgenres');
      console.log('  - cross_tags, formats, age_markets');
      process.exit(1);
    }

    console.log('\n=== STEP 2: Apply Batch 001 Enrichments ===\n');
    
    // Read all individual book SQL files
    const enrichmentDir = 'enrichment_sql';
    const bookFiles = [
      '00df7f2a-9ba5-4835-a09a-2b87c50c81ec.sql',
      '02901e6f-94d3-4104-9fd8-e609e75b6af0.sql',
      '02bd1dc8-22dd-4727-b837-ea1096cc97d6.sql',
      '03082e3d-3058-471b-a901-2956c1856f1e.sql',
      '033508ff-bb34-41d9-aef2-141f4ed8dc84.sql',
      '04537132-0262-4928-90cc-3b1abdbf04c4.sql',
      '0482d088-1b9f-44c1-93d3-0678504c6e1b.sql',
      '04b43824-68d4-4ccb-bc3e-48570d9de19a.sql',
      '05eaef7d-9e38-4e02-8fec-358dd2b16ed8.sql',
      '068a9286-750d-489b-8d68-b56825151747.sql'
    ];

    await client.query('BEGIN');
    
    for (const file of bookFiles) {
      const filePath = path.join(enrichmentDir, file);
      console.log(`Processing ${file}...`);
      
      try {
        const sql = await fs.readFile(filePath, 'utf-8');
        await client.query(sql);
        console.log(`  ✓ Applied`);
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        throw error;
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ All batch 001 enrichments applied successfully!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error applying enrichments:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
