import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

function getSql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL env var");
  return neon(url);
}

/**
 * GET /api/book-taxonomy
 * Query params:
 * - googleBooksId: external ID (preferred)
 * - bookId: internal UUID (optional alternative)
 *
 * Response shape:
 * { ok: true, data: { genre?: { slug, name }, subgenre?: { slug, name }, tags: Array<{ slug, name, group }>, allTagCount: number } }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "POST") {
      // Attach taxonomy hint (tag/subgenre) for a resolved book
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const googleBooksId = typeof body?.googleBooksId === "string" ? body.googleBooksId : null;
      const bookId = typeof body?.bookId === "string" ? body.bookId : null;
      const tagSlug = typeof body?.tagSlug === "string" ? body.tagSlug : null;
      const subgenreSlug = typeof body?.subgenreSlug === "string" ? body.subgenreSlug : null;
      const ageMarketSlug = typeof body?.ageMarketSlug === "string" ? body.ageMarketSlug : null;
      if (!googleBooksId && !bookId) {
        res.setHeader("Allow", "GET, POST");
        return res.status(400).json({ ok: false, error: "googleBooksId or bookId is required" });
      }
      const sql = getSql();
      // Resolve tolerant
      let row: Array<{ id: string }> = [];
      if (googleBooksId) {
        row = (await sql/* sql */`SELECT id FROM books WHERE google_books_id = ${googleBooksId} LIMIT 1`) as Array<{ id: string }>;
        if (!row[0]) {
          try {
            row = (await sql/* sql */`SELECT id FROM books WHERE id = ${googleBooksId}::uuid LIMIT 1`) as Array<{ id: string }>;
          } catch {}
        }
      }
      if (!row[0] && bookId) {
        row = (await sql/* sql */`SELECT id FROM books WHERE id = ${bookId} LIMIT 1`) as Array<{ id: string }>;
      }
      const resolved = row[0]?.id;
      if (!resolved) {
        return res.status(404).json({ ok: false, error: "book not found" });
      }
      let attachedTag = false;
      let attachedSub = false;
      let attachedAge = false;
      if (tagSlug) {
        const t = (await sql/* sql */`SELECT id FROM cross_tags WHERE slug = ${tagSlug} LIMIT 1`) as Array<{ id: string }>;
        if (t[0]?.id) {
          await sql/* sql */`
            INSERT INTO book_cross_tags (book_id, cross_tag_id, confidence)
            VALUES (${resolved}, ${t[0].id}, ${0.95})
            ON CONFLICT (book_id, cross_tag_id) DO NOTHING
          `;
          attachedTag = true;
        }
      }
      if (subgenreSlug) {
        const sg = (await sql/* sql */`SELECT id FROM subgenres WHERE slug = ${subgenreSlug} LIMIT 1`) as Array<{ id: string }>;
        if (sg[0]?.id) {
          await sql/* sql */`
            INSERT INTO book_subgenres (book_id, subgenre_id, confidence)
            VALUES (${resolved}, ${sg[0].id}, ${0.85})
            ON CONFLICT (book_id, subgenre_id) DO UPDATE SET confidence = EXCLUDED.confidence
          `;
          attachedSub = true;
        }
      }
      if (ageMarketSlug) {
        const am = (await sql/* sql */`SELECT id FROM age_markets WHERE slug = ${ageMarketSlug} LIMIT 1`) as Array<{ id: string }>;
        if (am[0]?.id) {
          await sql/* sql */`
            INSERT INTO book_age_markets (book_id, age_market_id)
            VALUES (${resolved}, ${am[0].id})
            ON CONFLICT (book_id, age_market_id) DO NOTHING
          `;
          attachedAge = true;
        }
      }
      return res.status(200).json({ ok: true, attached: { tag: attachedTag, subgenre: attachedSub, ageMarket: attachedAge } });
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).end("Method Not Allowed");
    }

    const googleBooksId = typeof req.query.googleBooksId === "string" ? req.query.googleBooksId : null;
    const bookId = typeof req.query.bookId === "string" ? req.query.bookId : null;
    if (!googleBooksId && !bookId) {
      return res.status(400).json({ ok: false, error: "googleBooksId or bookId is required" });
    }

    const sql = getSql();

    // Resolve internal book ID, being tolerant: some clients may pass the UUID in googleBooksId
    let bookRow: Array<{ id: string }>;    
    if (googleBooksId) {
      bookRow = (await sql/* sql */`SELECT id FROM books WHERE google_books_id = ${googleBooksId} LIMIT 1`) as Array<{ id: string }>;
      if (!bookRow[0]) {
        // Attempt as internal UUID when google_books_id lookup fails
        try {
          bookRow = (await sql/* sql */`SELECT id FROM books WHERE id = ${googleBooksId}::uuid LIMIT 1`) as Array<{ id: string }>;
        } catch {
          // ignore cast errors
        }
      }
    } else {
      bookRow = (await sql/* sql */`SELECT id FROM books WHERE id = ${bookId} LIMIT 1`) as Array<{ id: string }>;
    }

    const resolvedId = bookRow[0]?.id;
    if (!resolvedId) {
      // Not in DB yet (e.g., from external search). Return empty taxonomy.
      return res.status(200).json({ ok: true, data: { tags: [], allTagCount: 0 } });
    }

    // Get assigned genres and subgenres 
    const genres = await sql/* sql */`
      SELECT g.slug, g.name
      FROM book_genres bg
      JOIN genres g ON g.id = bg.genre_id
      WHERE bg.book_id = ${resolvedId}
      ORDER BY g.name
    ` as Array<{ slug: string; name: string }>;

    const subgenres = await sql/* sql */`
      SELECT sg.slug, sg.name, g.slug AS genre_slug, g.name AS genre_name
      FROM book_subgenres bsg
      JOIN subgenres sg ON sg.id = bsg.subgenre_id
      JOIN genres g ON g.id = sg.genre_id
      WHERE bsg.book_id = ${resolvedId}
      ORDER BY sg.name
    ` as Array<{ slug: string; name: string; genre_slug: string; genre_name: string }>;
    
    // Get age market
    const ageMarkets = await sql/* sql */`
      SELECT am.slug, am.name
      FROM book_age_markets bam
      JOIN age_markets am ON am.id = bam.age_market_id
      WHERE bam.book_id = ${resolvedId}
    ` as Array<{ slug: string; name: string }>;
    
    // Get formats
    const bookFormats = await sql/* sql */`
      SELECT f.slug, f.name
      FROM book_formats bf
      JOIN formats f ON f.id = bf.format_id
      WHERE bf.book_id = ${resolvedId}
    ` as Array<{ slug: string; name: string }>;

    // Cross tags
    const tags = await sql/* sql */`
      SELECT ct.slug, ct.name, ct."group"
      FROM book_cross_tags bct
      JOIN cross_tags ct ON ct.id = bct.cross_tag_id
      WHERE bct.book_id = ${resolvedId}
      ORDER BY ct."group" ASC, ct.name ASC
    ` as Array<{ slug: string; name: string; group: string }>;

    const data = {
      genres: genres,
      subgenres: subgenres,
      ageMarket: ageMarkets[0] || undefined,
      format: bookFormats[0]?.name || undefined,
      audience: ageMarkets[0]?.name || undefined,
      tags,
      allTagCount: tags.length,
      // Legacy compatibility - use first genre/subgenre if present
      genre: genres[0] || undefined,
      subgenre: subgenres[0] || undefined,
    };

    return res.status(200).json({ ok: true, data });
  } catch (error: any) {
    console.error("book-taxonomy error", error);
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to load taxonomy" });
  }
}
