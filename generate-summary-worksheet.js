// Generate Summary Rewrite Worksheet
// Creates a markdown file with all books needing summary rewrites

import fs from 'fs';

const ENRICHMENT_DIR = 'enrichment_data';
const OUTPUT_FILE = 'SUMMARY_REWRITE_WORKSHEET.md';

// Find all batch files and load books
function loadAllBooks() {
  const allBooks = [];
  for (let i = 1; i <= 100; i++) {
    const batchNum = String(i).padStart(3, '0');
    const batchFile = `books_batch_${batchNum}.json`;
    if (fs.existsSync(batchFile)) {
      const books = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
      allBooks.push(...books);
    }
  }
  return allBooks;
}

const allBooks = loadAllBooks();
const bookFiles = fs.readdirSync(ENRICHMENT_DIR).filter(f => f.endsWith('.json'));

let markdown = '# Summary Rewrite Worksheet\n\n';
markdown += '**Instructions:** For each book, write a NEW summary (150-300 words) in your own original words.\n\n';
markdown += '**Requirements:**\n';
markdown += '- No spoilers beyond first act\n';
markdown += '- No marketing language ("riveting", "stunning", etc.)\n';
markdown += '- No copied phrases longer than 3-4 words from original\n';
markdown += '- Focus on premise, themes, setting, and tone\n\n';
markdown += '---\n\n';

let count = 0;

bookFiles.forEach((file, index) => {
  const bookId = file.replace('.json', '');
  const enrichment = JSON.parse(fs.readFileSync(`${ENRICHMENT_DIR}/${file}`, 'utf8'));
  const book = allBooks.find(b => b.id === bookId);
  
  if (!book) return;
  
  if (enrichment.summary.status === 'needs_rewrite' || enrichment.summary.status === 'needs_generation') {
    count++;
    
    markdown += `## ${index + 1}. ${book.title}\n\n`;
    markdown += `**Book ID:** \`${bookId}\`  \n`;
    markdown += `**Author:** ${book.authors?.join(', ') || 'Unknown'}  \n`;
    markdown += `**ISBN:** ${book.isbn13 || book.isbn || 'N/A'}  \n\n`;
    
    // Original description for reference
    if (enrichment.summary.original_description) {
      markdown += `### Original Description (for reference only)\n\n`;
      markdown += `> ${enrichment.summary.original_description}\n\n`;
    } else {
      markdown += `### Original Description\n\n`;
      markdown += `*No existing description found - write from scratch using title, author, and categories.*\n\n`;
    }
    
    // Empty template for new summary
    markdown += `### NEW SUMMARY (150-300 words)\n\n`;
    markdown += `<!-- Write your new summary here -->\n\n`;
    markdown += `\n\n`;
    
    markdown += `---\n\n`;
  }
});

markdown += `\n\n**Total books requiring summary rewrites:** ${count}\n`;

fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`✅ Summary rewrite worksheet generated: ${OUTPUT_FILE}`);
console.log(`📝 ${count} books need summaries`);
