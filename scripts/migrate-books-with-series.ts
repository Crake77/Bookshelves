// Migrate books to works/editions and extract series information from descriptions
import { db } from "../db/index";
import { books, works, editions, releaseEvents } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  parsePublishedDate,
  extractSeriesInfo,
} from "../server/lib/editions-utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced series extraction from description
function extractSeriesFromDescription(title: string, description: string | null): { seriesName: string | null; seriesOrder: number | null } {
  if (!description) {
    return { seriesName: null, seriesOrder: null };
  }

  const desc = description.toLowerCase();
  
  // Wheel of Time patterns
  if (desc.includes("wheel of time") || desc.includes("the wheel of time")) {
    // Try to extract book number from title or description
    const bookMatch = title.match(/book\s+(\d+)/i) || description.match(/book\s+(\d+)/i);
    const seriesOrder = bookMatch ? parseInt(bookMatch[1], 10) : null;
    
    // Check if it's book 1 (Eye of the World)
    if (title.toLowerCase().includes("eye of the world")) {
      return { seriesName: "Wheel of Time", seriesOrder: 1 };
    }
    // Check if it's book 2 (The Great Hunt)
    if (title.toLowerCase().includes("great hunt")) {
      return { seriesName: "Wheel of Time", seriesOrder: 2 };
    }
    
    return { seriesName: "Wheel of Time", seriesOrder: seriesOrder };
  }
  
  // Other common series patterns can be added here
  // e.g., "Dune Chronicles", "Harry Potter", etc.
  
  return { seriesName: null, seriesOrder: null };
}

async function main() {
  console.log("🔄 Starting book migration to works/editions with series extraction...\n");
  
  // Get all books that haven't been migrated yet
  const allBooks = await db.select().from(books).execute();
  console.log(`📚 Found ${allBooks.length} books in database\n`);
  
  // Check which ones are already migrated
  const migratedBooks = await db
    .select({ legacyBookId: editions.legacyBookId })
    .from(editions)
    .where(sql`${editions.legacyBookId} IS NOT NULL`)
    .execute();
  
  const migratedIds = new Set(migratedBooks.map(e => e.legacyBookId));
  
  const booksToMigrate = allBooks.filter(b => !migratedIds.has(b.id));
  console.log(`📝 ${booksToMigrate.length} books need migration (${allBooks.length - booksToMigrate.length} already migrated)\n`);
  
  if (booksToMigrate.length === 0) {
    console.log("✅ All books are already migrated!");
    
    // Update series info for existing works
    console.log("\n🔄 Updating series information for existing works...");
    const existingWorks = await db.select().from(works).execute();
    
    for (const work of existingWorks) {
      // Process all works, even if they already have series (to update if needed)
      
      // Find the book it came from
      const edition = await db
        .select({ legacyBookId: editions.legacyBookId })
        .from(editions)
        .where(eq(editions.workId, work.id))
        .limit(1)
        .execute();
      
      if (edition.length === 0 || !edition[0].legacyBookId) continue;
      
      const book = await db
        .select()
        .from(books)
        .where(eq(books.id, edition[0].legacyBookId))
        .limit(1)
        .execute();
      
      if (book.length === 0) continue;
      
      // Try to load enrichment data
      let seriesName = null;
      let seriesOrder = null;
      
      try {
        const enrichmentPath = join(__dirname, "..", "enrichment_data", `${book[0].id}.json`);
        const enrichmentData = JSON.parse(readFileSync(enrichmentPath, "utf-8"));
        const description = enrichmentData.summary?.new_summary || enrichmentData.summary?.original_description || book[0].description || "";
        
        const seriesInfo = extractSeriesFromDescription(work.title, description);
        seriesName = seriesInfo.seriesName;
        seriesOrder = seriesInfo.seriesOrder;
      } catch {
        // No enrichment file, try from book description
        const seriesInfo = extractSeriesFromDescription(work.title, book[0].description || "");
        seriesName = seriesInfo.seriesName;
        seriesOrder = seriesInfo.seriesOrder;
      }
      
      if (seriesName) {
        await db
          .update(works)
          .set({ series: seriesName, seriesOrder: seriesOrder })
          .where(eq(works.id, work.id))
          .execute();
        
        console.log(`✅ Updated ${work.title} → Series: ${seriesName}${seriesOrder ? ` (Book ${seriesOrder})` : ""}`);
      }
    }
    
    process.exit(0);
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const book of booksToMigrate) {
    try {
      // Try to load enrichment data for series info
      let seriesName = null;
      let seriesOrder = null;
      
      try {
        const enrichmentPath = join(__dirname, "..", "enrichment_data", `${book.id}.json`);
        const enrichmentData = JSON.parse(readFileSync(enrichmentPath, "utf-8"));
        const description = enrichmentData.summary?.new_summary || enrichmentData.external_metadata?.input_snapshot?.original_description || book.description || "";
        
        const seriesInfo = extractSeriesFromDescription(book.title, description);
        seriesName = seriesInfo.seriesName;
        seriesOrder = seriesInfo.seriesOrder;
      } catch {
        // No enrichment file, try from book description
        const seriesInfo = extractSeriesFromDescription(book.title, book.description || "");
        seriesName = seriesInfo.seriesName;
        seriesOrder = seriesInfo.seriesOrder;
      }
      
      const pubDate = parsePublishedDate(book.publishedDate);
      
      // Create work
      const [work] = await db
        .insert(works)
        .values({
          title: book.title,
          authors: book.authors,
          description: book.description,
          series: seriesName,
          seriesOrder: seriesOrder,
          originalPublicationDate: pubDate,
          latestMajorReleaseDate: pubDate,
          latestAnyReleaseDate: pubDate,
          nextMajorReleaseDate: null,
          displayEditionId: null,
          matchConfidence: 100,
          isManuallyConfirmed: false,
        })
        .returning()
        .execute();
      
      // Create edition
      const [edition] = await db
        .insert(editions)
        .values({
          workId: work.id,
          legacyBookId: book.id,
          format: "unknown",
          publicationDate: pubDate,
          language: null,
          market: null,
          isbn10: book.isbn?.length === 10 ? book.isbn : null,
          isbn13: book.isbn?.length === 13 ? book.isbn : null,
          googleBooksId: book.googleBooksId,
          openLibraryId: null,
          editionStatement: null,
          pageCount: book.pageCount,
          categories: book.categories || [],
          coverUrl: book.coverUrl,
          isManual: false,
        })
        .returning()
        .execute();
      
      // Update work with display edition
      await db
        .update(works)
        .set({ displayEditionId: edition.id })
        .where(eq(works.id, work.id))
        .execute();
      
      // Create release event if date exists
      if (pubDate) {
        await db
          .insert(releaseEvents)
          .values({
            editionId: edition.id,
            eventDate: pubDate,
            eventType: "ORIGINAL_RELEASE",
            isMajor: true,
            promoStrength: 100,
            market: null,
            notes: "Migrated from books table",
          })
          .execute();
      }
      
      processed++;
      if (seriesName) {
        console.log(`✅ ${book.title} → Series: ${seriesName}${seriesOrder ? ` (Book ${seriesOrder})` : ""}`);
      } else {
        console.log(`✅ ${book.title} → No series`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error migrating ${book.title}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  process.exit(0);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

