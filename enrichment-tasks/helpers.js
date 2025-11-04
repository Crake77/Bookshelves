// Helper functions for enrichment tasks
import fs from 'fs';

/**
 * Finds which batch file contains the given book ID
 * @param {string} bookId - The book ID to search for
 * @returns {string} - Path to the batch file containing the book
 */
export function findBatchFile(bookId) {
  // Try batch files in order (001, 002, 003, etc.)
  for (let i = 1; i <= 100; i++) {
    const batchNum = String(i).padStart(3, '0');
    const batchFile = `books_batch_${batchNum}.json`;
    
    if (fs.existsSync(batchFile)) {
      const booksData = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
      const book = booksData.find(b => b.id === bookId);
      if (book) {
        return batchFile;
      }
    }
  }
  
  throw new Error(`Book ${bookId} not found in any batch file`);
}

/**
 * Loads a book from the appropriate batch file
 * @param {string} bookId - The book ID to load
 * @returns {object} - The book object
 */
export function loadBookFromBatch(bookId) {
  const batchFile = findBatchFile(bookId);
  const booksData = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in ${batchFile}`);
  }
  
  return book;
}

