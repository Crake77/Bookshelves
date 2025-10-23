import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

const DATABASE_URL = "postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function deployTaxonomy() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // Read the SQL file with explicit UTF-8 encoding (cross-tags only)
    const sqlFilePath = 'C:\\Users\\johnd\\Downloads\\taxonomy_crosstags_only.sql';
    const sqlContent = fs.readFileSync(sqlFilePath, { encoding: 'utf8', flag: 'r' });
    
    console.log('📄 SQL file loaded');
    console.log(`   File size: ${(sqlContent.length / 1024).toFixed(2)} KB`);
    console.log(`   Lines: ${sqlContent.split('\n').length}\n`);

    // Get counts before deployment
    console.log('📊 Checking current database state...');
    const beforeResult = await client.query(`
      SELECT "group", COUNT(*) as count 
      FROM cross_tags 
      GROUP BY "group" 
      ORDER BY "group"
    `);
    
    console.log('Current cross_tags counts:');
    beforeResult.rows.forEach(row => {
      console.log(`   ${row.group}: ${row.count}`);
    });
    const totalBefore = beforeResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    console.log(`   TOTAL: ${totalBefore}\n`);

    // Execute the SQL
    console.log('🚀 Deploying taxonomy expansion...');
    console.log('   This may take a few moments...\n');
    
    await client.query(sqlContent);
    
    console.log('✅ SQL executed successfully!\n');

    // Get counts after deployment
    console.log('📊 Verifying deployment...');
    const afterResult = await client.query(`
      SELECT "group", COUNT(*) as count 
      FROM cross_tags 
      GROUP BY "group" 
      ORDER BY "group"
    `);
    
    console.log('New cross_tags counts:');
    afterResult.rows.forEach(row => {
      console.log(`   ${row.group}: ${row.count}`);
    });
    const totalAfter = afterResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    console.log(`   TOTAL: ${totalAfter}`);
    console.log(`   ADDED: ${totalAfter - totalBefore} new tags\n`);

    // Verify genre-supergenre links
    const genreLinksResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM genre_supergenres
    `);
    console.log(`✅ Genre-supergenre links: ${genreLinksResult.rows[0].count}\n`);

    console.log('🎉 Deployment completed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment failed:');
    console.error(error.message);
    if (error.position) {
      console.error(`   Error at position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

deployTaxonomy();
