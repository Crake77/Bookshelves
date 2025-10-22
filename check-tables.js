import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function checkTables() {
  console.log('Checking database tables...\n');
  
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  
  console.log('Found tables:');
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  
  console.log('\nChecking for tags and audiences specifically...');
  const hasTags = tables.find(t => t.table_name === 'tags');
  const hasAudiences = tables.find(t => t.table_name === 'audiences');
  
  console.log(`  tags: ${hasTags ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  audiences: ${hasAudiences ? '✅ EXISTS' : '❌ MISSING'}`);
}

checkTables().catch(console.error);
