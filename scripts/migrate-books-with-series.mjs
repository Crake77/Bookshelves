// Migrate books to works/editions and extract series information
import { db } from "../db/index.js";
import { books, works, editions, releaseEvents } from "@shared/schema.js";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to extract series info from description or title
function extractSeriesInfo(title, description) {
  // Common series patterns
  const wheelOfTimePattern = /wheel of time/i;
  const bookNumberPattern = /book\s+(\d+)/i;
  const seriesPattern = /series[:\s]+([^,\.]+)/i;
  
  let seriesName = null;
  let seriesOrder = null;
  
  // Check for Wheel of Time
  if (wheelOfTimePattern.test(title) || (description && wheelOfTimePattern.test(description))) {
    seriesName = "Wheel of Time";
    const match = title.match(bookNumberPattern) || (description && description.match(bookNumberPattern));
    if (match) {
      seriesOrder = parseInt(match[1], 10);
    }
  }
  
  // Check for series mentioned in description
  if (!seriesName && description) {
    const match = description.match(seriesPattern);
    if (match) {
      seriesName = match[1].trim();
    }
  }
  
  return { seriesName, seriesOrder };
}

// Parse publication date
function parsePublishedDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Handle "1990", "1990-01", "1990-01-15"
    if (/^\d{4}$/.test(dateString)) {
      return new Date(`${dateString}-01-01`);
    } else if (/^\d{4}-\d{2}$/.test(dateString)) {
      return new Date(`${dateString}-01`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return new Date(dateString);
    }
  } catch {
    return null;
  }
  
  return null;
}

async function main() {
  console.log("🔄 Starting book migration to works/editions...\n");
  
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
        
        // Extract series info from enrichment or description
        const seriesInfo = extractSeriesInfo(book.title, book.description || enrichmentData.summary?.new_summary || "");
        seriesName = seriesInfo.seriesName;
        seriesOrder = seriesInfo.seriesOrder;
      } catch {
        // No enrichment file, try from book description
        const seriesInfo = extractSeriesInfo(book.title, book.description || "");
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
      console.error(`❌ Error migrating ${book.title}:`, error.message);
    }
  }
  
  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  // Now update series counts for all works with series
  console.log(`\n🔄 Updating series counts...`);
  const seriesWorks = await db
    .select({ series: works.series })
    .from(works)
    .where(sql`${works.series} IS NOT NULL`)
    .groupBy(works.series)
    .execute();
  
  console.log(`   Found ${seriesWorks.length} unique series`);
  
  process.exit(0);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

