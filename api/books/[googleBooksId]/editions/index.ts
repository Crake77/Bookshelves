// Vercel serverless function wrapper for editions endpoint
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/index.js";
import { editions, books } from "@shared/schema.js";
import { eq } from "drizzle-orm";
import { getWorkEditions } from "../../../server/lib/editions-api.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { googleBooksId } = req.query;
    
    if (!googleBooksId || typeof googleBooksId !== "string") {
      return res.status(400).json({ error: "googleBooksId is required" });
    }

    // Find edition by googleBooksId
    let edition = await db
      .select()
      .from(editions)
      .where(eq(editions.googleBooksId, googleBooksId))
      .limit(1)
      .execute();

    // Fallback: If no edition found, check legacy books table
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

      // Create a mock edition from the legacy book
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

    const workId = edition[0].workId;

    // Get all editions for this work
    const editionsList = await getWorkEditions(workId);

    // Filter to only high-quality covers (no scans)
    const qualityEditions = editionsList.filter((e: any) => {
      if (!e.coverUrl) return false;
      const url = e.coverUrl.toLowerCase();
      return !url.includes("edge=curl") && !url.includes("edge=shadow");
    });

    // If no quality editions, return all (user can still see them)
    res.json(qualityEditions.length > 0 ? qualityEditions : editionsList);
  } catch (error) {
    console.error("Get editions error:", error);
    res.status(500).json({ error: "Failed to get editions" });
  }
}

