// Vercel serverless function wrapper for series-info endpoint
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../../../db/index.js";
import { editions, works, books } from "@shared/schema.js";
import { eq, and, isNotNull, sql } from "drizzle-orm";

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
      .select({ workId: editions.workId })
      .from(editions)
      .where(eq(editions.googleBooksId, googleBooksId))
      .limit(1)
      .execute();

    let workId: string | null = null;

    // Fallback: If no edition found, check legacy books table
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

      // For legacy books, we don't have series info yet
      return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
    }

    workId = edition[0].workId;

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

    res.json({
      series: seriesName,
      seriesOrder: seriesOrder,
      totalBooksInSeries: totalBooksInSeries,
      workId: workId,
    });
  } catch (error) {
    console.error("Get series info error:", error);
    res.status(500).json({ error: "Failed to get series info" });
  }
}

