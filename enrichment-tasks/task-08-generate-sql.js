// Task 8: Generate SQL for Single Book
// Usage: node task-08-generate-sql.js <book_id>
// Output: Creates enrichment_sql/<book_id>.sql

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const SQL_DIR = 'enrichment_sql';

// Helper to escape SQL strings
function sqlEscape(str) {
  if (!str) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// Helper to format JSON array for PostgreSQL
function sqlJsonArray(arr) {
  if (!arr || arr.length === 0) return 'NULL';
  return sqlEscape(JSON.stringify(arr));
}

async function generateSQL(bookId) {
  console.log(`🔨 Task 8: Generating SQL for book ${bookId}...`);
  
  // Ensure SQL directory exists
  if (!fs.existsSync(SQL_DIR)) {
    fs.mkdirSync(SQL_DIR);
  }
  
  // Load enrichment data
  const enrichmentPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  if (!fs.existsSync(enrichmentPath)) {
    throw new Error(`Enrichment data not found for ${bookId}`);
  }
  
  const enrichment = JSON.parse(fs.readFileSync(enrichmentPath, 'utf8'));
  
  // Load original book data
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  
  let sql = '';
  
  // Header comment
  sql += `-- Enrichment SQL for: ${book.title}\n`;
  sql += `-- Book ID: ${bookId}\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  
  // DELETE existing taxonomy links (idempotent)
  sql += `-- Clean up existing taxonomy links\n`;
  sql += `DELETE FROM book_domains WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_supergenres WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_genres WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_subgenres WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_cross_tags WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_age_markets WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_formats WHERE book_id = '${bookId}';\n\n`;
  
  // UPDATE books table
  sql += `-- Update book metadata\n`;
  sql += `UPDATE books SET\n`;
  
  const updates = [];
  
  // Authors (REQUIRED)
  if (enrichment.authors && enrichment.authors.validated.length > 0) {
    updates.push(`  authors = ${sqlJsonArray(enrichment.authors.validated)}`);
  }
  
  // Description/Summary (if manually written)
  if (enrichment.summary && enrichment.summary.new_summary) {
    updates.push(`  description = ${sqlEscape(enrichment.summary.new_summary)}`);
  }
  
  // Cover URL
  if (enrichment.cover_urls && enrichment.cover_urls.recommended) {
    updates.push(`  cover_url = ${sqlEscape(enrichment.cover_urls.recommended)}`);
  }
  
  sql += updates.join(',\n');\
sql += `\nWHERE id = '${bookId}';\n\n`;
  
  // INSERT Domain
  if (enrichment.taxonomy && enrichment.taxonomy.domain && enrichment.taxonomy.domain.slug) {
    sql += `-- Insert domain\n`;
    sql += `INSERT INTO book_domains (book_id, domain_id)\n`;
    sql += `SELECT '${bookId}', id FROM domains WHERE slug = '${enrichment.taxonomy.domain.slug}';\n\n`;
  }
  
  // INSERT Supergenres
  if (enrichment.taxonomy && enrichment.taxonomy.supergenres && enrichment.taxonomy.supergenres.length > 0) {
    sql += `-- Insert supergenres\n`;
    enrichment.taxonomy.supergenres.forEach(sg => {
      sql += `INSERT INTO book_supergenres (book_id, supergenre_id)\n`;
      sql += `SELECT '${bookId}', id FROM supergenres WHERE slug = '${sg.slug}';\n`;
    });
    sql += '\n';
  }
  
  // INSERT Genres
  if (enrichment.taxonomy && enrichment.taxonomy.genres && enrichment.taxonomy.genres.length > 0) {
    sql += `-- Insert genres\n`;
    enrichment.taxonomy.genres.forEach(g => {
      sql += `INSERT INTO book_genres (book_id, genre_id)\n`;
      sql += `SELECT '${bookId}', id FROM genres WHERE slug = '${g.slug}';\n`;
    });
    sql += '\n';
  }
  
  // INSERT Subgenres
  if (enrichment.taxonomy && enrichment.taxonomy.subgenres && enrichment.taxonomy.subgenres.length > 0) {
    sql += `-- Insert subgenres\n`;
    enrichment.taxonomy.subgenres.forEach(sg => {
      sql += `INSERT INTO book_subgenres (book_id, subgenre_id)\n`;
      sql += `SELECT '${bookId}', id FROM subgenres WHERE slug = '${sg.slug}';\n`;
    });
    sql += '\n';
  }
  
  // INSERT Cross-tags
  if (enrichment.taxonomy && enrichment.taxonomy.cross_tags && enrichment.taxonomy.cross_tags.length > 0) {
    sql += `-- Insert cross-tags (${enrichment.taxonomy.cross_tags.length} tags)\n`;
    enrichment.taxonomy.cross_tags.forEach(tag => {
      sql += `INSERT INTO book_cross_tags (book_id, cross_tag_id)\n`;
      sql += `SELECT '${bookId}', id FROM cross_tags WHERE slug = '${tag.slug}';\n`;
    });
    sql += '\n';
  }
  
  // INSERT Audience
  if (enrichment.audience && enrichment.audience.slug) {
    sql += `-- Insert audience\n`;
    sql += `INSERT INTO book_age_markets (book_id, age_market_id)\n`;
    sql += `SELECT '${bookId}', id FROM age_markets WHERE slug = '${enrichment.audience.slug}';\n\n`;
  }
  
  // INSERT Format (if detected)
  if (enrichment.format && enrichment.format.slug) {
    sql += `-- Insert format\n`;
    sql += `INSERT INTO book_formats (book_id, format_id)\n`;
    sql += `SELECT '${bookId}', id FROM formats WHERE slug = '${enrichment.format.slug}';\n\n`;
  }
  
  // Save SQL file
  const sqlPath = path.join(SQL_DIR, `${bookId}.sql`);
  fs.writeFileSync(sqlPath, sql);
  
  console.log(`  💾 SQL saved to ${sqlPath}`);
  console.log(`  ✅ Generated ${sql.split('\n').length} lines of SQL`);
  
  return { path: sqlPath, lines: sql.split('\n').length };
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-08-generate-sql.js <book_id>');
  process.exit(1);
}

generateSQL(bookId).catch(console.error);
