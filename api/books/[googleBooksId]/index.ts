// Vercel serverless function for book-related endpoints (editions and series-info)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, and, isNotNull, sql } from "drizzle-orm";

// Import schema types
import { books, editions, works } from "@shared/schema.js";

// Create database connection for Vercel serverless
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Get all editions for a work (serverless-compatible version)
async function getWorkEditions(workId: string) {
  // Get all editions for this work
  const allEditions = await db
    .select()
    .from(editions)
    .where(eq(editions.workId, workId))
    .execute();

  // Get release events for these editions
  const editionIds = allEditions.map((e) => e.id);
  let events: any[] = [];
  if (editionIds.length > 0) {
    const { releaseEvents } = await import("@shared/schema.js");
    const { inArray } = await import("drizzle-orm");
    try {
      events = await db
        .select()
        .from(releaseEvents)
        .where(inArray(releaseEvents.editionId, editionIds))
        .execute();
    } catch (e) {
      // If releaseEvents table doesn't exist or query fails, continue without events
      console.warn("Failed to fetch release events:", e);
    }
  }

  // Group events by edition
  const eventsByEdition = new Map<string, typeof events>();
  for (const event of events) {
    const editionEvents = eventsByEdition.get(event.editionId) || [];
    editionEvents.push(event);
    eventsByEdition.set(event.editionId, editionEvents);
  }

  // Combine editions with their events
  return allEditions.map((edition) => ({
    ...edition,
    events: eventsByEdition.get(edition.id) || [],
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { googleBooksId, endpoint } = req.query;
    
    if (!googleBooksId || typeof googleBooksId !== "string") {
      return res.status(400).json({ error: "googleBooksId is required" });
    }

    // Route based on endpoint parameter
    if (endpoint === "editions") {
      // Find edition by googleBooksId
      let edition = await db
        .select()
        .from(editions)
        .where(eq(editions.googleBooksId, googleBooksId))
        .limit(1)
        .execute();

      // Fallback: If no edition found, check legacy books table and find edition via legacyBookId
      let workId: string | null = null;
      if (edition.length === 0) {
        const legacyBook = await db
          .select()
          .from(books)
          .where(eq(books.googleBooksId, googleBooksId))
          .limit(1)
          .execute();

        if (legacyBook.length === 0) {
          return res.json([]);
        }

        // Check if there's an edition linked to this legacy book
        const linkedEdition = await db
          .select()
          .from(editions)
          .where(eq(editions.legacyBookId, legacyBook[0].id))
          .limit(1)
          .execute();

        if (linkedEdition.length > 0) {
          // Found migrated edition, use it
          edition = linkedEdition;
          workId = linkedEdition[0].workId;
        } else {
          // Not migrated yet, create a mock edition from the legacy book
          const mockEdition = {
            id: legacyBook[0].id,
            workId: legacyBook[0].id,
            legacyBookId: legacyBook[0].id,
            format: "unknown",
            publicationDate: legacyBook[0].publishedDate ? new Date(legacyBook[0].publishedDate) : null,
            language: null,
            market: null,
            isbn10: legacyBook[0].isbn?.length === 10 ? legacyBook[0].isbn : null,
            isbn13: legacyBook[0].isbn?.length === 13 ? legacyBook[0].isbn : null,
            googleBooksId: legacyBook[0].googleBooksId,
            openLibraryId: null,
            editionStatement: null,
            pageCount: legacyBook[0].pageCount,
            categories: legacyBook[0].categories || [],
            coverUrl: legacyBook[0].coverUrl,
            isManual: false,
            createdAt: new Date(),
            events: [],
          };

          return res.json([mockEdition]);
        }
      } else {
        workId = edition[0].workId;
      }

      // Get all editions for this work
      const editionsList = await getWorkEditions(workId);

      // Filter to only high-quality covers (no scans)
      const qualityEditions = editionsList.filter((e: any) => {
        if (!e.coverUrl) return false;
        const url = e.coverUrl.toLowerCase();
        return !url.includes("edge=curl") && !url.includes("edge=shadow");
      });

      // If no quality editions, return all (user can still see them)
      return res.json(qualityEditions.length > 0 ? qualityEditions : editionsList);
    } else if (endpoint === "series-info") {
      // Find edition by googleBooksId
      let edition = await db
        .select({ workId: editions.workId })
        .from(editions)
        .where(eq(editions.googleBooksId, googleBooksId))
        .limit(1)
        .execute();

      let workId: string | null = null;

      // Fallback: If no edition found, check legacy books table and find edition via legacyBookId
      if (edition.length === 0) {
        const legacyBook = await db
          .select()
          .from(books)
          .where(eq(books.googleBooksId, googleBooksId))
          .limit(1)
          .execute();

        if (legacyBook.length === 0) {
          return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
        }

        // Find edition linked to this legacy book
        const linkedEdition = await db
          .select({ workId: editions.workId })
          .from(editions)
          .where(eq(editions.legacyBookId, legacyBook[0].id))
          .limit(1)
          .execute();

        if (linkedEdition.length === 0) {
          // No migration yet, return null
          return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
        }

        workId = linkedEdition[0].workId;
      } else {
        workId = edition[0].workId;
      }

      // Get work info
      const work = await db
        .select({
          series: works.series,
          seriesOrder: works.seriesOrder,
        })
        .from(works)
        .where(eq(works.id, workId))
        .limit(1)
        .execute();

      if (work.length === 0) {
        return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
      }

      const seriesName = work[0].series;
      const seriesOrder = work[0].seriesOrder;

      // Get total books in series (count works with same series name and non-null series_order)
      let totalBooksInSeries: number | null = null;
      if (seriesName) {
        const countResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(works)
          .where(
            and(
              eq(works.series, seriesName),
              isNotNull(works.seriesOrder)
            )
          )
          .execute();

        totalBooksInSeries = countResult[0]?.count ?? null;
      }

      return res.json({
        series: seriesName,
        seriesOrder: seriesOrder,
        totalBooksInSeries: totalBooksInSeries,
        workId: workId,
      });
    } else {
      return res.status(400).json({ error: "Invalid endpoint. Use 'editions' or 'series-info'" });
    }
  } catch (error) {
    console.error("Book API error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
}

