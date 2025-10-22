import { db } from "../db/index";
import { books, works, editions, releaseEvents } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  parsePublishedDate,
  detectEventType,
  updateWorkDates,
  calculateMatchScore,
  normalizeTitle,
  extractSeriesInfo,
} from "../server/lib/editions-utils";

/**
 * Phase 1: Create initial works and editions from existing books
 * Each book becomes a work with one edition
 */
export async function phase1_backfill() {
  console.log("Phase 1: Backfilling works and editions from books table...");
  
  // Fetch all books in batches
  const batchSize = 100;
  let offset = 0;
  let processedCount = 0;
  let errorCount = 0;
  
  while (true) {
    const booksBatch = await db
      .select()
      .from(books)
      .limit(batchSize)
      .offset(offset)
      .execute();
    
    if (booksBatch.length === 0) break;
    
    for (const book of booksBatch) {
      try {
        // Parse publication date
        const pubDate = parsePublishedDate(book.publishedDate);
        
        // Extract series info from title
        const seriesInfo = extractSeriesInfo(book.title);
        
        // Create work
        const [work] = await db
          .insert(works)
          .values({
            title: book.title,
            authors: book.authors,
            description: book.description,
            series: null, // Will be set during deduplication
            seriesOrder: seriesInfo.seriesNumber,
            originalPublicationDate: pubDate,
            latestMajorReleaseDate: pubDate,
            latestAnyReleaseDate: pubDate,
            nextMajorReleaseDate: null,
            displayEditionId: null, // Will be set after creating edition
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
            format: "unknown", // Will be enriched later
            publicationDate: pubDate,
            language: null,
            market: null,
            isbn10: book.isbn?.length === 10 ? book.isbn : null,
            isbn13: book.isbn?.length === 13 ? book.isbn : null,
            googleBooksId: book.googleBooksId,
            openLibraryId: null,
            editionStatement: null,
            pageCount: book.pageCount,
            categories: book.categories,
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
        
        // Create original release event if date exists
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
              notes: `Migrated from books table (book_id: ${book.id})`,
            })
            .execute();
        }
        
        processedCount++;
        
        if (processedCount % 50 === 0) {
          console.log(`  Processed ${processedCount} books...`);
        }
      } catch (error) {
        console.error(`  Error processing book ${book.id}:`, error);
        errorCount++;
      }
    }
    
    offset += batchSize;
  }
  
  console.log(`Phase 1 complete: ${processedCount} books migrated, ${errorCount} errors`);
}

/**
 * Phase 2: Identify and merge duplicate works
 * Uses fuzzy matching on title, author, ISBN
 */
export async function phase2_deduplicateWorks() {
  console.log("Phase 2: Deduplicating works...");
  
  // Fetch all works
  const allWorks = await db.select().from(works).execute();
  console.log(`  Found ${allWorks.length} works to analyze`);
  
  const mergedCount = { count: 0 };
  const matchThreshold = 70; // Merge if score >= 70
  
  // Group works by normalized title for faster comparison
  const titleGroups = new Map<string, typeof allWorks>();
  
  for (const work of allWorks) {
    const normalizedTitle = normalizeTitle(work.title);
    const seriesInfo = extractSeriesInfo(normalizedTitle);
    const baseTitle = normalizeTitle(seriesInfo.title);
    
    if (!titleGroups.has(baseTitle)) {
      titleGroups.set(baseTitle, []);
    }
    titleGroups.get(baseTitle)!.push(work);
  }
  
  console.log(`  Grouped into ${titleGroups.size} title clusters`);
  
  // Process each group
  for (const [baseTitle, group] of titleGroups) {
    if (group.length < 2) continue; // No duplicates possible
    
    // Compare all pairs within group
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const workA = group[i];
        const workB = group[j];
        
        // Skip if already confirmed manually
        if (workA.isManuallyConfirmed || workB.isManuallyConfirmed) continue;
        
        // Get ISBNs from editions
        const editionsA = await db
          .select({ isbn13: editions.isbn13, isbn10: editions.isbn10 })
          .from(editions)
          .where(eq(editions.workId, workA.id))
          .limit(1)
          .execute();
        
        const editionsB = await db
          .select({ isbn13: editions.isbn13, isbn10: editions.isbn10 })
          .from(editions)
          .where(eq(editions.workId, workB.id))
          .limit(1)
          .execute();
        
        const score = calculateMatchScore(
          { title: workA.title, authors: workA.authors, isbn: editionsA[0]?.isbn13 || editionsA[0]?.isbn10 },
          { title: workB.title, authors: workB.authors, isbn: editionsB[0]?.isbn13 || editionsB[0]?.isbn10 }
        );
        
        if (score >= matchThreshold) {
          console.log(`  Merging works (score ${score}): "${workA.title}" + "${workB.title}"`);
          await mergeWorks(workA.id, workB.id);
          mergedCount.count++;
        }
      }
    }
  }
  
  console.log(`Phase 2 complete: ${mergedCount.count} works merged`);
}

/**
 * Merge two works: move all editions from workB to workA, delete workB
 */
async function mergeWorks(keepWorkId: string, mergeWorkId: string) {
  // Move all editions from mergeWork to keepWork
  await db
    .update(editions)
    .set({ workId: keepWorkId })
    .where(eq(editions.workId, mergeWorkId))
    .execute();
  
  // Recalculate dates for the merged work
  await updateWorkDates(keepWorkId);
  
  // Delete the merged work (cascade will handle relations)
  await db
    .delete(works)
    .where(eq(works.id, mergeWorkId))
    .execute();
}

/**
 * Phase 3: Enrich editions with format detection
 * Detect formats from categories and Google Books data
 */
export async function phase3_enrichFormats() {
  console.log("Phase 3: Enriching edition formats...");
  
  const formatKeywords = {
    audiobook: ["audiobook", "audio", "audible"],
    ebook: ["ebook", "kindle", "epub", "digital"],
    paperback: ["paperback", "mass market", "trade paperback"],
    hardcover: ["hardcover", "hardback"],
    manga: ["manga", "comic", "graphic novel"],
  };
  
  let enrichedCount = 0;
  const batchSize = 100;
  let offset = 0;
  
  while (true) {
    const editionsBatch = await db
      .select()
      .from(editions)
      .where(eq(editions.format, "unknown"))
      .limit(batchSize)
      .offset(offset)
      .execute();
    
    if (editionsBatch.length === 0) break;
    
    for (const edition of editionsBatch) {
      let detectedFormat = "unknown";
      
      // Check categories
      const cats = (edition.categories || []).join(" ").toLowerCase();
      
      for (const [format, keywords] of Object.entries(formatKeywords)) {
        if (keywords.some(kw => cats.includes(kw))) {
          detectedFormat = format;
          break;
        }
      }
      
      // Update if format detected
      if (detectedFormat !== "unknown") {
        await db
          .update(editions)
          .set({ format: detectedFormat })
          .where(eq(editions.id, edition.id))
          .execute();
        
        enrichedCount++;
      }
    }
    
    offset += batchSize;
  }
  
  console.log(`Phase 3 complete: ${enrichedCount} edition formats detected`);
}

/**
 * Run all migration phases
 */
export async function runMigration() {
  console.log("Starting edition migration...\n");
  
  try {
    await phase1_backfill();
    console.log();
    
    await phase2_deduplicateWorks();
    console.log();
    
    await phase3_enrichFormats();
    console.log();
    
    console.log("✅ Migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
