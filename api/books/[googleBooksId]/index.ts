// Vercel serverless function for book-related endpoints (editions and series-info)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { googleBooksId, endpoint } = req.query;
    
    if (!googleBooksId || typeof googleBooksId !== "string") {
      return res.status(400).json({ error: "googleBooksId is required" });
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    const sql = neon(process.env.DATABASE_URL);

    // Route based on endpoint parameter
    if (endpoint === "editions") {
      // Find edition by googleBooksId
      let edition = await sql`
        SELECT id, work_id, legacy_book_id, format, publication_date, language, market,
               isbn10, isbn13, google_books_id, open_library_id, edition_statement,
               page_count, categories, cover_url, is_manual, created_at
        FROM editions
        WHERE google_books_id = ${googleBooksId}
        LIMIT 1
      `;

      let workId: string | null = null;

      // Fallback: If no edition found, check legacy books table and find edition via legacyBookId
      if (edition.length === 0) {
        const legacyBook = await sql`
          SELECT id, google_books_id, isbn, page_count, categories, cover_url, published_date
          FROM books
          WHERE google_books_id = ${googleBooksId}
          LIMIT 1
        `;

        if (legacyBook.length === 0) {
          return res.json([]);
        }

        // Check if there's an edition linked to this legacy book
        const linkedEdition = await sql`
          SELECT id, work_id, legacy_book_id, format, publication_date, language, market,
                 isbn10, isbn13, google_books_id, open_library_id, edition_statement,
                 page_count, categories, cover_url, is_manual, created_at
          FROM editions
          WHERE legacy_book_id = ${legacyBook[0].id}
          LIMIT 1
        `;

        if (linkedEdition.length > 0) {
          // Found migrated edition, use it
          edition = linkedEdition;
          workId = linkedEdition[0].work_id;
        } else {
          // Not migrated yet, create a mock edition from the legacy book
          const mockEdition = {
            id: legacyBook[0].id,
            work_id: legacyBook[0].id,
            legacy_book_id: legacyBook[0].id,
            format: "unknown",
            publication_date: legacyBook[0].published_date ? new Date(legacyBook[0].published_date) : null,
            language: null,
            market: null,
            isbn10: legacyBook[0].isbn?.length === 10 ? legacyBook[0].isbn : null,
            isbn13: legacyBook[0].isbn?.length === 13 ? legacyBook[0].isbn : null,
            google_books_id: legacyBook[0].google_books_id,
            open_library_id: null,
            edition_statement: null,
            page_count: legacyBook[0].page_count,
            categories: legacyBook[0].categories || [],
            cover_url: legacyBook[0].cover_url,
            is_manual: false,
            created_at: new Date(),
            events: [],
          };

          return res.json([mockEdition]);
        }
      } else {
        workId = edition[0].work_id;
      }

      // Get work info to check for OpenLibrary work ID
      const workInfo = await sql`
        SELECT work_ref_type, work_ref_value, title, authors
        FROM works
        WHERE id = ${workId}
        LIMIT 1
      `;

      // Get all editions from database
      const dbEditions = await sql`
        SELECT id, work_id, legacy_book_id, format, publication_date, language, market,
               isbn10, isbn13, google_books_id, open_library_id, edition_statement,
               page_count, categories, cover_url, is_manual, created_at
        FROM editions
        WHERE work_id = ${workId}
      `;

      // Try to fetch additional editions from OpenLibrary if we have a work reference
      let openLibraryEditions: any[] = [];
      if (workInfo.length > 0 && workInfo[0].work_ref_type === 'openlibrary' && workInfo[0].work_ref_value) {
        try {
          const olWorkId = workInfo[0].work_ref_value;
          // Fetch work with all editions from OpenLibrary API
          const olResponse = await fetch(`https://openlibrary.org/works/${olWorkId}.json`);
          if (olResponse.ok) {
            const olWork = await olResponse.json();
            // OpenLibrary works have an 'editions' field that is a URL endpoint
            // Fetch all editions from that endpoint
            const editionsUrl = olWork.editions || `https://openlibrary.org/works/${olWorkId}/editions.json`;
            const editionsResponse = await fetch(editionsUrl);
            if (editionsResponse.ok) {
              const editionsData = await editionsResponse.json();
              // Process editions array - entries might be in 'entries' or directly in the response
              const entries = editionsData.entries || editionsData || [];
                openLibraryEditions = entries.slice(0, 100).map((ed: any) => {
                  // Build cover URL
                  let coverUrl = null;
                  if (ed.covers && ed.covers.length > 0) {
                    coverUrl = `https://covers.openlibrary.org/b/id/${ed.covers[0]}-L.jpg`;
                  }
                  
                  // Detect format from categories or keywords
                  let format = 'unknown';
                  const categories = (ed.subjects || []).map((s: any) => typeof s === 'string' ? s : s.toLowerCase());
                  const keywords = (ed.keywords || []).map((k: any) => typeof k === 'string' ? k : k.toLowerCase());
                  const allText = [...categories, ...keywords].join(' ').toLowerCase();
                  
                  if (allText.includes('hardcover') || allText.includes('hardback')) format = 'hardcover';
                  else if (allText.includes('paperback')) format = 'paperback';
                  else if (allText.includes('ebook') || allText.includes('e-book') || allText.includes('kindle')) format = 'ebook';
                  else if (allText.includes('audiobook') || allText.includes('audio book')) format = 'audiobook';
                  else if (ed.physical_format) {
                    const pf = ed.physical_format.toLowerCase();
                    if (pf.includes('hardcover') || pf.includes('hardback')) format = 'hardcover';
                    else if (pf.includes('paperback')) format = 'paperback';
                    else if (pf.includes('ebook') || pf.includes('kindle')) format = 'ebook';
                    else if (pf.includes('audiobook') || pf.includes('audio')) format = 'audiobook';
                    else format = pf;
                  }

                  return {
                    id: `ol-${ed.key?.replace('/books/', '') || Date.now()}`,
                    workId: workId,
                    legacyBookId: null,
                    format: format,
                    publicationDate: ed.publish_date ? new Date(ed.publish_date) : null,
                    language: ed.languages?.[0]?.key?.replace('/languages/', '') || null,
                    market: null,
                    isbn10: ed.isbn_10?.[0] || null,
                    isbn13: ed.isbn_13?.[0] || null,
                    googleBooksId: null,
                    openLibraryId: ed.key?.replace('/books/', '') || null,
                    editionStatement: null,
                    pageCount: ed.number_of_pages || null,
                    categories: ed.subjects || [],
                    coverUrl: coverUrl,
                    isManual: false,
                    createdAt: new Date(),
                    events: [],
                  };
                }).filter((e: any) => e.coverUrl); // Only include editions with covers
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch OpenLibrary editions:", e);
        }
      }

      // Combine database editions with OpenLibrary editions
      // Use a Set to track which ISBNs/OLIDs we've seen to avoid duplicates
      const seenIds = new Set<string>();
      const allEditions: any[] = [];

      // Add database editions first (these are the source of truth)
      for (const e of dbEditions) {
        const key = e.isbn13 || e.isbn10 || e.open_library_id || e.id;
        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          allEditions.push(e);
        }
      }

      // Add OpenLibrary editions that aren't duplicates
      for (const e of openLibraryEditions) {
        const key = e.isbn13 || e.isbn10 || e.openLibraryId || e.id;
        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          allEditions.push(e);
        }
      }

      // Filter to only high-quality covers (no scans)
      const qualityEditions = allEditions.filter((e: any) => {
        if (!e.cover_url && !e.coverUrl) return false;
        const url = (e.cover_url || e.coverUrl || '').toLowerCase();
        return !url.includes("edge=curl") && !url.includes("edge=shadow");
      });

      // Map to expected format
      const formattedEditions = (qualityEditions.length > 0 ? qualityEditions : allEditions).map((e: any) => ({
        id: e.id,
        workId: e.work_id || e.workId,
        legacyBookId: e.legacy_book_id || e.legacyBookId,
        format: e.format !== 'unknown' ? e.format : (e.categories?.some((c: string) => c.toLowerCase().includes('hardcover')) ? 'hardcover' : e.categories?.some((c: string) => c.toLowerCase().includes('paperback')) ? 'paperback' : 'unknown'),
        publicationDate: e.publication_date || e.publicationDate,
        language: e.language,
        market: e.market,
        isbn10: e.isbn10,
        isbn13: e.isbn13,
        googleBooksId: e.google_books_id || e.googleBooksId,
        openLibraryId: e.open_library_id || e.openLibraryId,
        editionStatement: e.edition_statement || e.editionStatement,
        pageCount: e.page_count || e.pageCount,
        categories: e.categories || [],
        coverUrl: e.cover_url || e.coverUrl,
        isManual: e.is_manual || e.isManual,
        createdAt: e.created_at || e.createdAt,
        events: [],
      }));

      return res.json(formattedEditions);
    } else if (endpoint === "series-info") {
      // Find edition by googleBooksId
      let edition = await sql`
        SELECT work_id
        FROM editions
        WHERE google_books_id = ${googleBooksId}
        LIMIT 1
      `;

      let workId: string | null = null;

      // Fallback: If no edition found, check legacy books table and find edition via legacyBookId
      if (edition.length === 0) {
        const legacyBook = await sql`
          SELECT id
          FROM books
          WHERE google_books_id = ${googleBooksId}
          LIMIT 1
        `;

        if (legacyBook.length === 0) {
          return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
        }

        // Find edition linked to this legacy book
        const linkedEdition = await sql`
          SELECT work_id
          FROM editions
          WHERE legacy_book_id = ${legacyBook[0].id}
          LIMIT 1
        `;

        if (linkedEdition.length === 0) {
          // No migration yet, return null
          return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
        }

        workId = linkedEdition[0].work_id;
      } else {
        workId = edition[0].work_id;
      }

      // Get work info
      const work = await sql`
        SELECT series, series_order
        FROM works
        WHERE id = ${workId}
        LIMIT 1
      `;

      if (work.length === 0) {
        return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
      }

      const seriesName = work[0].series;
      const seriesOrder = work[0].series_order;

      // Get total books in series (count works with same series name and non-null series_order)
      let totalBooksInSeries: number | null = null;
      if (seriesName) {
        const countResult = await sql`
          SELECT COUNT(*)::int as count
          FROM works
          WHERE series = ${seriesName} AND series_order IS NOT NULL
        `;

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
  } catch (error: any) {
    console.error("Book API error:", error);
    console.error("Error stack:", error?.stack);
    res.status(500).json({ 
      error: "Failed to process request",
      message: error?.message || "Unknown error",
      debug: process.env.NODE_ENV === "development" ? error?.stack : undefined
    });
  }
}
