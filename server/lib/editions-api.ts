import { db } from "../../db/index";
import { works, editions, releaseEvents, books, releaseEventTypes } from "@shared/schema";
import { eq, desc, asc, and, or, gte, lte, notInArray, sql, isNotNull } from "drizzle-orm";
import {
  parsePublishedDate,
  detectEventType,
  updateWorkDates,
  calculateMatchScore,
} from "./editions-utils";

type ReleaseEventType = (typeof releaseEventTypes)[number];

/**
 * Create a work and edition from a book ingest
 * Dual-write strategy: maintains compatibility with existing books table
 */
export async function createWorkFromBook(bookData: {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  publishedDate: string | null;
  isbn: string | null;
  coverUrl: string | null;
  googleBooksId: string | null;
  pageCount: number | null;
  categories: string[] | null;
}): Promise<{ workId: string; editionId: string }> {
  const pubDate = parsePublishedDate(bookData.publishedDate);
  
  // Check if work already exists for this book
  const existingEdition = await db
    .select({ workId: editions.workId })
    .from(editions)
    .where(eq(editions.legacyBookId, bookData.id))
    .limit(1)
    .execute();
  
  if (existingEdition.length > 0) {
    // Already migrated
    return {
      workId: existingEdition[0].workId,
      editionId: existingEdition[0].workId, // Return the work ID for now
    };
  }
  
  // Create new work
  const [work] = await db
    .insert(works)
    .values({
      title: bookData.title,
      authors: bookData.authors,
      description: bookData.description,
      series: null,
      seriesOrder: null,
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
  
  // Detect event type and promo strength
  const eventInfo = detectEventType(null, bookData.categories);
  
  // Create edition
  const [edition] = await db
    .insert(editions)
    .values({
      workId: work.id,
      legacyBookId: bookData.id,
      format: "unknown",
      publicationDate: pubDate,
      language: null,
      market: null,
      isbn10: bookData.isbn?.length === 10 ? bookData.isbn : null,
      isbn13: bookData.isbn?.length === 13 ? bookData.isbn : null,
      googleBooksId: bookData.googleBooksId,
      openLibraryId: null,
      editionStatement: null,
      pageCount: bookData.pageCount,
      categories: bookData.categories,
      coverUrl: bookData.coverUrl,
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
        notes: "Created from book ingest",
      })
      .execute();
  }
  
  return {
    workId: work.id,
    editionId: edition.id,
  };
}

/**
 * Browse works with filtering and sorting
 * Replaces the old books-based browse logic
 */
export async function browseWorks(options: {
  sort?: "original" | "latestMajor" | "latestAny" | "title";
  recentDays?: number;
  excludeUserBookIds?: string[];
  limit?: number;
  offset?: number;
}) {
  const {
    sort = "latestMajor",
    recentDays = 90,
    excludeUserBookIds = [],
    limit = 50,
    offset = 0,
  } = options;
  
  let query = db
    .select({
      id: works.id,
      title: works.title,
      authors: works.authors,
      description: works.description,
      series: works.series,
      seriesOrder: works.seriesOrder,
      originalPublicationDate: works.originalPublicationDate,
      latestMajorReleaseDate: works.latestMajorReleaseDate,
      latestAnyReleaseDate: works.latestAnyReleaseDate,
      nextMajorReleaseDate: works.nextMajorReleaseDate,
      displayEditionId: works.displayEditionId,
      matchConfidence: works.matchConfidence,
      // Join to get cover URL from display edition
      coverUrl: editions.coverUrl,
    })
    .from(works)
    .leftJoin(editions, eq(works.displayEditionId, editions.id));
  
  // Filter by recent releases if sort is latestMajor
  if (sort === "latestMajor" && recentDays) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - recentDays);
    
    query = query.where(
      and(
        isNotNull(works.latestMajorReleaseDate),
        gte(works.latestMajorReleaseDate, sinceDate)
      )
    ) as any;
  }
  
  // Exclude user's books (need to join through editions to legacy books)
  if (excludeUserBookIds.length > 0) {
    // Get work IDs to exclude
    const worksToExclude = await db
      .selectDistinct({ workId: editions.workId })
      .from(editions)
      .where(
        and(
          isNotNull(editions.legacyBookId),
          sql`${editions.legacyBookId} IN (${sql.join(excludeUserBookIds.map(id => sql`${id}`), sql`, `)})`
        )
      )
      .execute();
    
    const excludeWorkIds = worksToExclude.map(w => w.workId);
    if (excludeWorkIds.length > 0) {
      query = query.where(
        sql`${works.id} NOT IN (${sql.join(excludeWorkIds.map(id => sql`${id}`), sql`, `)})`
      ) as any;
    }
  }
  
  // Apply sorting
  switch (sort) {
    case "original":
      query = query.orderBy(asc(works.originalPublicationDate)) as any;
      break;
    case "latestAny":
      query = query.orderBy(desc(works.latestAnyReleaseDate)) as any;
      break;
    case "title":
      query = query.orderBy(asc(works.title)) as any;
      break;
    case "latestMajor":
    default:
      query = query.orderBy(desc(works.latestMajorReleaseDate)) as any;
      break;
  }
  
  // Apply pagination
  query = query.limit(limit).offset(offset) as any;
  
  return query.execute();
}

/**
 * Get all editions for a work
 */
export async function getWorkEditions(workId: string) {
  const editionsList = await db
    .select()
    .from(editions)
    .where(eq(editions.workId, workId))
    .orderBy(desc(editions.publicationDate))
    .execute();
  
  // Fetch events for all editions
  if (editionsList.length === 0) return [];
  
  const editionIds = editionsList.map(e => e.id);
  const eventsList = await db
    .select()
    .from(releaseEvents)
    .where(
      sql`${releaseEvents.editionId} IN (${sql.join(editionIds.map(id => sql`${id}`), sql`, `)})`
    )
    .orderBy(asc(releaseEvents.eventDate))
    .execute();
  
  // Group events by edition
  const eventsByEdition = new Map<string, typeof eventsList>();
  for (const event of eventsList) {
    if (!eventsByEdition.has(event.editionId)) {
      eventsByEdition.set(event.editionId, []);
    }
    eventsByEdition.get(event.editionId)!.push(event);
  }
  
  // Attach events to editions
  return editionsList.map(edition => ({
    ...edition,
    events: eventsByEdition.get(edition.id) || [],
  }));
}

/**
 * Get a single work with full details
 */
export async function getWorkDetails(workId: string) {
  const [work] = await db
    .select()
    .from(works)
    .where(eq(works.id, workId))
    .execute();
  
  if (!work) return null;
  
  const editionsWithEvents = await getWorkEditions(workId);
  
  return {
    ...work,
    editions: editionsWithEvents,
  };
}

/**
 * Add a new edition to an existing work
 */
export async function addEditionToWork(
  workId: string,
  editionData: {
    format: string;
    publicationDate?: Date | null;
    language?: string | null;
    market?: string | null;
    isbn10?: string | null;
    isbn13?: string | null;
    editionStatement?: string | null;
    coverUrl?: string | null;
    googleBooksId?: string | null;
    pageCount?: number | null;
    categories?: string[] | null;
  },
  eventType: ReleaseEventType = "MINOR_REPRINT",
  promoStrength: number = 20
) {
  // Create edition
  const [edition] = await db
    .insert(editions)
    .values({
      workId,
      legacyBookId: null,
      format: editionData.format,
      publicationDate: editionData.publicationDate || null,
      language: editionData.language || null,
      market: editionData.market || null,
      isbn10: editionData.isbn10 || null,
      isbn13: editionData.isbn13 || null,
      googleBooksId: editionData.googleBooksId || null,
      openLibraryId: null,
      editionStatement: editionData.editionStatement || null,
      pageCount: editionData.pageCount || null,
      categories: editionData.categories || null,
      coverUrl: editionData.coverUrl || null,
      isManual: true,
    })
    .returning()
    .execute();
  
  // Create release event
  if (editionData.publicationDate) {
    const isMajor = promoStrength >= 60 || ["ORIGINAL_RELEASE", "FORMAT_FIRST_RELEASE", "NEW_TRANSLATION", "REVISED_EXPANDED"].includes(eventType);
    
    await db
      .insert(releaseEvents)
      .values({
        editionId: edition.id,
        eventDate: editionData.publicationDate,
        eventType,
        isMajor,
        promoStrength,
        market: editionData.market || null,
        notes: "Manually added edition",
      })
      .execute();
    
    // Recalculate work dates
    await updateWorkDates(workId);
  }
  
  return edition;
}
