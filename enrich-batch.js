// Master Orchestration Script
// Usage: node enrich-batch.js [batch_number]
// Examples:
//   node enrich-batch.js        -> uses books_batch_001.json (default)
//   node enrich-batch.js 001    -> uses books_batch_001.json
//   node enrich-batch.js 002    -> uses books_batch_002.json
// Runs all enrichment tasks for all books in the specified batch file

import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Get batch number from command line or default to 001
const batchNumber = process.argv[2] || '001';
const BOOKS_FILE = `books_batch_${batchNumber.padStart(3, '0')}.json`;

async function runTask(taskScript, bookId) {
  try {
    const { stdout, stderr } = await execAsync(`node enrichment-tasks/${taskScript} "${bookId}"`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { success: true, bookId, task: taskScript };
  } catch (error) {
    console.error(`❌ Task ${taskScript} failed for ${bookId}:`, error.message);
    return { success: false, bookId, task: taskScript, error: error.message };
  }
}

async function enrichBook(bookId, bookTitle) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📖 Enriching: ${bookTitle}`);
  console.log(`   ID: ${bookId}`);
  console.log(`${'='.repeat(80)}\n`);
  
  const tasks = [
    'task-00-external-metadata.js',
    'task-01-cover-urls.js',
    'task-02-authors.js',
    'task-03-summary.js',
    'task-04-domain-supergenres.js',
    'task-05-genres-subgenres.js',
    'task-06-cross-tags.js',
    'task-07-format-audience.js',
    'task-08-generate-sql.js'
  ];
  
  const results = [];
  
  for (const task of tasks) {
    const result = await runTask(task, bookId);
    results.push(result);
    
    if (!result.success) {
      console.log(`⚠️  Continuing despite error...`);
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Completed ${successCount}/${tasks.length} tasks for ${bookTitle}\n`);
  
  return results;
}

async function main() {
  console.log(`\n🚀 Starting Batch Enrichment Process\n`);
  console.log(`Reading books from: ${BOOKS_FILE}\n`);
  
  // Check if file exists
  if (!fs.existsSync(BOOKS_FILE)) {
    console.error(`❌ Error: ${BOOKS_FILE} not found!`);
    console.error(`\nAvailable batch files:`);
    const files = fs.readdirSync('.').filter(f => f.startsWith('books_batch_') && f.endsWith('.json'));
    if (files.length > 0) {
      files.forEach(f => console.error(`   - ${f}`));
    } else {
      console.error(`   No batch files found in current directory`);
    }
    process.exit(1);
  }
  
  // Load books
  const books = JSON.parse(fs.readFileSync(BOOKS_FILE, 'utf8'));
  console.log(`📚 Found ${books.length} books to enrich\n`);
  
  const allResults = [];
  
  // Process each book
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    console.log(`\n[${i + 1}/${books.length}] Processing book...`);
    
    const results = await enrichBook(book.id, book.title);
    allResults.push({
      bookId: book.id,
      title: book.title,
      taskResults: results
    });
  }
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 BATCH ENRICHMENT SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  
  const totalTasks = allResults.reduce((sum, b) => sum + b.taskResults.length, 0);
  const successfulTasks = allResults.reduce((sum, b) => 
    sum + b.taskResults.filter(r => r.success).length, 0);
  
  console.log(`Books processed: ${books.length}`);
  console.log(`Total tasks run: ${totalTasks}`);
  console.log(`Successful: ${successfulTasks}`);
  console.log(`Failed: ${totalTasks - successfulTasks}`);
  console.log(`Success rate: ${((successfulTasks / totalTasks) * 100).toFixed(1)}%\n`);
  
  // List books with issues
  const booksWithIssues = allResults.filter(b => 
    b.taskResults.some(r => !r.success)
  );
  
  if (booksWithIssues.length > 0) {
    console.log(`⚠️  Books with issues (${booksWithIssues.length}):`);
    booksWithIssues.forEach(b => {
      console.log(`   - ${b.title}`);
      b.taskResults.filter(r => !r.success).forEach(r => {
        console.log(`     ❌ ${r.task}: ${r.error}`);
      });
    });
    console.log();
  }
  
  console.log(`\n✅ Batch enrichment complete!\n`);
  console.log(`Next steps:`);
  console.log(`1. Review enrichment_data/ for individual book enrichment JSON files`);
  console.log(`2. Review enrichment_sql/ for generated SQL files`);
  console.log(`3. Manually write summaries for books marked "needs_rewrite"`);
  console.log(`4. Run aggregation script to combine SQL and generate reports\n`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
