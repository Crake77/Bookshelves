import { neon } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';

const sql = neon(process.env.DATABASE_URL);

async function exportTaxonomy() {
  console.log('Exporting taxonomy data...');
  
  const taxonomy = {};
  
  // Export taxonomy tables (using actual table names)
  try { taxonomy.genres = await sql`SELECT slug, name FROM genres ORDER BY name`; } catch(e) { console.log('- genres table not found'); }
  try { taxonomy.subgenres = await sql`SELECT s.slug, s.name, g.slug as genre_slug FROM subgenres s JOIN genres g ON s.genre_id = g.id ORDER BY g.slug, s.name`; } catch(e) { console.log('- subgenres table not found'); }
  try { taxonomy.cross_tags = await sql`SELECT slug, name, "group" FROM cross_tags ORDER BY "group", name`; } catch(e) { console.log('- cross_tags table not found'); }
  try { taxonomy.domains = await sql`SELECT slug, name FROM domains ORDER BY name`; } catch(e) { console.log('- domains table not found'); }
  try { taxonomy.supergenres = await sql`SELECT slug, name FROM supergenres ORDER BY name`; } catch(e) { console.log('- supergenres table not found'); }
  try { taxonomy.age_markets = await sql`SELECT slug, name FROM age_markets ORDER BY name`; } catch(e) { console.log('- age_markets table not found'); }
  try { taxonomy.formats = await sql`SELECT slug, name FROM formats ORDER BY name`; } catch(e) { console.log('- formats table not found'); }
  
  writeFileSync('TAXONOMY_REFERENCE.json', JSON.stringify(taxonomy, null, 2));
  console.log('✓ Exported to TAXONOMY_REFERENCE.json');
  
  // Also get book count and sample
  const bookCount = await sql`SELECT COUNT(*) as count FROM books`;
  const sampleBooks = await sql`
    SELECT id, title, authors, description, published_date, categories 
    FROM books 
    LIMIT 10
  `;
  
  const bookInfo = {
    totalBooks: bookCount[0].count,
    sampleBooks: sampleBooks
  };
  
  writeFileSync('BOOK_SAMPLE.json', JSON.stringify(bookInfo, null, 2));
  console.log('✓ Exported to BOOK_SAMPLE.json');
  console.log(`Total books in database: ${bookCount[0].count}`);
}

exportTaxonomy().catch(console.error);
