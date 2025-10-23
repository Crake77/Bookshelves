// Execute Batch 001 SQL against Neon Database
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function executeBatchSQL() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected\n');

    // Read all SQL files in order
    const sqlDir = 'enrichment_sql';
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

    console.log('🚀 Starting transaction for 10 books...\n');
    await client.query('BEGIN');

    let bookCount = 0;
    for (const file of bookFiles) {
      const filePath = path.join(sqlDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      bookCount++;
      console.log(`📖 [${bookCount}/10] Executing: ${file}`);
      
      try {
        await client.query(sql);
        console.log(`   ✅ Success\n`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}\n`);
        throw err;
      }
    }

    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');
    console.log(`\n📊 Summary: ${bookCount} books updated`);

  } catch (error) {
    console.error('\n❌ Error executing SQL:', error.message);
    console.error('\n🔄 Rolling back transaction...');
    await client.query('ROLLBACK');
    console.error('⏪ Rollback complete - no changes applied');
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

executeBatchSQL();
