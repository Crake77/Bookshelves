import 'dotenv/config';
import { db } from '../db/index.js';
import { books } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const batch001Ids = [
    '00df7f2a-9ba5-4835-a09a-2b87c50c81ec',
    '02901e6f-94d3-4104-9fd8-e609e75b6af0',
    '02bd1dc8-22dd-4727-b837-ea1096cc97d6',
    '03082e3d-3058-471b-a901-2956c1856f1e',
    '033508ff-bb34-41d9-aef2-141f4ed8dc84',
    '04537132-0262-4928-90cc-3b1abdbf04c4',
    '0482d088-1b9f-44c1-93d3-0678504c6e1b',
    '04b43824-68d4-4ccb-bc3e-48570d9de19a',
    '05eaef7d-9e38-4e02-8fec-358dd2b16ed8',
    '068a9286-750d-489b-8d68-b56825151747'
  ];
  
  const allBooks = await db.query.books.findMany({
    columns: { id: true, title: true, description: true },
  });
  
  const batch002 = allBooks.filter(b => !batch001Ids.includes(b.id));
  
  console.log(`\n📚 Total books in database: ${allBooks.length}`);
  console.log(`📖 Batch 001: 10 books`);
  console.log(`📖 Batch 002: ${batch002.length} books\n`);
  
  if (batch002.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('BATCH 002 BOOKS (Loaded but NOT enriched):');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    batch002.forEach((b, i) => {
      const hasDesc = b.description && b.description.length > 100 ? '✅' : '❌';
      console.log(`${i + 1}. ${hasDesc} ${b.title}`);
      console.log(`   ID: ${b.id}`);
      console.log(`   Description: ${hasDesc === '✅' ? `${b.description.length} chars` : 'Missing or too short'}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('STATUS: Batch 002 books are in the database but have NO enrichment data.');
    console.log('NEXT STEP: Run enrichment pipeline for these 10 books.');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  } else {
    console.log('Only batch 001 books found (10 books)');
  }
}

main().catch(console.error);

