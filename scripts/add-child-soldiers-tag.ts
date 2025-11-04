// Add child-soldiers tag to database
// Usage: npx tsx scripts/add-child-soldiers-tag.ts

import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function addChildSoldiersTag() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if tag already exists
    const checkResult = await client.query(
      `SELECT slug, name FROM cross_tags WHERE slug = 'child-soldiers'`
    );

    if (checkResult.rows.length > 0) {
      console.log('ℹ️  Tag "child-soldiers" already exists in database');
      console.log(`   Slug: ${checkResult.rows[0].slug}`);
      console.log(`   Name: ${checkResult.rows[0].name}`);
      return;
    }

    // Insert the tag
    const insertResult = await client.query(
      `INSERT INTO cross_tags (slug, name, "group", description, enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slug, name, "group"`,
      [
        'child-soldiers',
        'Child Soldiers',
        'content_flags',
        'Depicts children or minors in combat or military roles',
        true
      ]
    );

    console.log('✅ Successfully added "child-soldiers" tag to database:');
    console.log(`   ID: ${insertResult.rows[0].id}`);
    console.log(`   Slug: ${insertResult.rows[0].slug}`);
    console.log(`   Name: ${insertResult.rows[0].name}`);
    console.log(`   Group: ${insertResult.rows[0].group}`);
    console.log('\n✅ Tag is now ready for enrichment use');

  } catch (error) {
    console.error('❌ Error adding tag:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addChildSoldiersTag().catch(console.error);

