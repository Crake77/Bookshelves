// Task 8: Lint Enrichment Data / Optional SQL Preview
// Usage: node task-08-generate-sql.js [--write-sql] <book_id>
// - Default mode only validates the enrichment JSON and reports any blockers
// - Pass --write-sql to emit the legacy SQL file (for manual review/backups)

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const SQL_DIR = 'enrichment_sql';

function parseArgs() {
  const args = process.argv.slice(2);
  let writeSql = false;
  const positional = [];
  for (const arg of args) {
    if (arg === '--write-sql') {
      writeSql = true;
    } else {
      positional.push(arg);
    }
  }
  const bookId = positional[0];
  if (!bookId) {
    console.error('Usage: node task-08-generate-sql.js [--write-sql] <book_id>');
    process.exit(1);
  }
  return { bookId, writeSql };
}

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

function lintEnrichment(bookId, enrichment) {
  const issues = [];
  if (!enrichment.authors?.validated?.length) {
    issues.push('Missing validated authors');
  }
  if (!enrichment.summary?.new_summary) {
    issues.push('Missing rewritten summary');
  }
  if (!enrichment.taxonomy?.domain?.slug) {
    issues.push('Missing domain assignment');
  }
  const crossTags = enrichment.taxonomy?.cross_tags ?? [];
  if (crossTags.length < 10) {
    issues.push(`Cross-tags below minimum (found ${crossTags.length}, need 10-20)`);
  }
  if (!enrichment.audience?.slug) {
    issues.push('Missing audience assignment');
  }
  if (!enrichment.format?.slug) {
    issues.push('Missing format assignment');
  }
  return issues;
}

async function generateSQL(bookId, writeSql) {
  console.log(`🔎 Task 8: Linting enrichment for book ${bookId}...`);
  
  if (writeSql && !fs.existsSync(SQL_DIR)) {
    fs.mkdirSync(SQL_DIR, { recursive: true });
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
  const lintIssues = lintEnrichment(bookId, enrichment);
  if (lintIssues.length) {
    console.log(`  ❌ Lint failed (${lintIssues.length} issues):`);
    lintIssues.forEach((issue) => console.log(`   - ${issue}`));
  } else {
    console.log('  ✅ Lint passed: summary, taxonomy, audience, format, and cross-tags all present.');
  }
  
  if (!writeSql) {
    return;
  }
  
  let sql = '';
  sql += `-- Enrichment SQL for: ${book.title}\n`;
  sql += `-- Book ID: ${bookId}\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  sql += `-- Clean up existing taxonomy links\n`;
  sql += `DELETE FROM book_domains WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_supergenres WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_genres WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_subgenres WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_cross_tags WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_age_markets WHERE book_id = '${bookId}';\n`;
  sql += `DELETE FROM book_formats WHERE book_id = '${bookId}';\n\n`;
  sql += `-- Update book metadata\n`;
  sql += `UPDATE books SET\n`;
  const updates = [];
  if (enrichment.authors && enrichment.authors.validated.length > 0) {
    const authorsArray = enrichment.authors.validated.map(a => `'${a.replace(/'/g, "''")}' `).join(', ');
    updates.push(`  authors = ARRAY[${authorsArray}]`);
  }
  if (enrichment.summary && enrichment.summary.new_summary) {
    updates.push(`  description = ${sqlEscape(enrichment.summary.new_summary)}`);
  }
  if (enrichment.cover_urls && enrichment.cover_urls.recommended) {
    updates.push(`  cover_url = ${sqlEscape(enrichment.cover_urls.recommended)}`);
  }
  sql += updates.join(',\n');
  sql += `\nWHERE id = '${bookId}';\n\n`;
  if (enrichment.taxonomy?.domain?.slug) {
    sql += `-- Insert domain\n`;
    sql += `INSERT INTO book_domains (book_id, domain_id)\n`;
    sql += `SELECT '${bookId}', id FROM domains WHERE slug = '${enrichment.taxonomy.domain.slug}';\n\n`;
  }
  if (enrichment.taxonomy?.supergenres?.length) {
    sql += `-- Insert supergenres\n`;
    enrichment.taxonomy.supergenres.forEach(sg => {
      sql += `INSERT INTO book_supergenres (book_id, supergenre_id)\n`;
      sql += `SELECT '${bookId}', id FROM supergenres WHERE slug = '${sg.slug}';\n`;
    });
    sql += '\n';
  }
  if (enrichment.taxonomy?.genres?.length) {
    sql += `-- Insert genres\n`;
    enrichment.taxonomy.genres.forEach(g => {
      sql += `INSERT INTO book_genres (book_id, genre_id)\n`;
      sql += `SELECT '${bookId}', id FROM genres WHERE slug = '${g.slug}';\n`;
    });
    sql += '\n';
  }
  if (enrichment.taxonomy?.subgenres?.length) {
    sql += `-- Insert subgenres\n`;
    enrichment.taxonomy.subgenres.forEach(sg => {
      sql += `INSERT INTO book_subgenres (book_id, subgenre_id)\n`;
      sql += `SELECT '${bookId}', id FROM subgenres WHERE slug = '${sg.slug}';\n`;
    });
    sql += '\n';
  }
  if (enrichment.taxonomy?.cross_tags?.length) {
    sql += `-- Insert cross-tags (${enrichment.taxonomy.cross_tags.length} tags)\n`;
    const confidenceMap = { high: 0.9, medium: 0.75, low: 0.5 };
    enrichment.taxonomy.cross_tags.forEach(tag => {
      const confidenceValue = confidenceMap[tag.confidence] || null;
      const sourceIds = Array.isArray(tag.provenance_snapshot_ids)
        ? tag.provenance_snapshot_ids.filter(Boolean)
        : [];
      const columns = ['book_id', 'cross_tag_id'];
      const selectParts = [`'${bookId}'`, 'id'];
      if (confidenceValue !== null) {
        columns.push('confidence');
        selectParts.push(confidenceValue.toString());
      }
      if (tag.method) {
        columns.push('method');
        selectParts.push(sqlEscape(tag.method));
      }
      if (sourceIds.length > 0) {
        columns.push('source_ids');
        const arrayLiteral = sourceIds.map(id => `'${id}'::uuid`).join(', ');
        selectParts.push(`ARRAY[${arrayLiteral}]`);
      }
      sql += `INSERT INTO book_cross_tags (${columns.join(', ')})\n`;
      sql += `SELECT ${selectParts.join(', ')} FROM cross_tags WHERE slug = '${tag.slug}';\n`;
    });
    sql += '\n';
  }
  if (enrichment.audience?.slug) {
    sql += `-- Insert audience\n`;
    sql += `INSERT INTO book_age_markets (book_id, age_market_id)\n`;
    sql += `SELECT '${bookId}', id FROM age_markets WHERE slug = '${enrichment.audience.slug}';\n\n`;
  }
  if (enrichment.format?.slug) {
    sql += `-- Insert format\n`;
    sql += `INSERT INTO book_formats (book_id, format_id)\n`;
    sql += `SELECT '${bookId}', id FROM formats WHERE slug = '${enrichment.format.slug}';\n\n`;
  }
  const sqlPath = path.join(SQL_DIR, `${bookId}.sql`);
  fs.writeFileSync(sqlPath, sql);
  console.log(`  💾 SQL saved to ${sqlPath}`);
}

const { bookId, writeSql } = parseArgs();
generateSQL(bookId, writeSql).catch(console.error);
