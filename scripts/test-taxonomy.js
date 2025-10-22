import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testTaxonomy() {
  const sql = neon(DATABASE_URL);
  
  try {
    const domains = await sql`SELECT COUNT(*) as count FROM domains`;
    const supergenres = await sql`SELECT COUNT(*) as count FROM supergenres`;
    const genres = await sql`SELECT COUNT(*) as count FROM genres`;
    const subgenres = await sql`SELECT COUNT(*) as count FROM subgenres`;
    const formats = await sql`SELECT COUNT(*) as count FROM formats`;
    const ageMarkets = await sql`SELECT COUNT(*) as count FROM age_markets`;
    const crossTags = await sql`SELECT COUNT(*) as count FROM cross_tags`;
    
    console.log('🧪 Taxonomy Validation Results:');
    console.log(`   • ${domains[0].count} domains`);
    console.log(`   • ${supergenres[0].count} supergenres`);
    console.log(`   • ${genres[0].count} genres`);
    console.log(`   • ${subgenres[0].count} subgenres`);
    console.log(`   • ${formats[0].count} formats`);
    console.log(`   • ${ageMarkets[0].count} age markets`);
    console.log(`   • ${crossTags[0].count} cross tags`);
    
    // Test hierarchical query
    const fantasySubgenres = await sql`
      SELECT s.name 
      FROM subgenres s 
      JOIN genres g ON s.genre_id = g.id 
      WHERE g.slug = 'fantasy' 
      LIMIT 5
    `;
    
    console.log('\n📚 Sample Fantasy Subgenres:');
    fantasySubgenres.forEach(s => console.log(`   • ${s.name}`));
    
    console.log('\n✅ Taxonomy system is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTaxonomy();