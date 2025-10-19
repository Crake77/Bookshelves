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
            INSERT INTO book_primary_subgenres (book_id, subgenre_id, confidence)
            VALUES (${resolved}, ${sg[0].id}, ${0.85})
            ON CONFLICT (book_id)
            DO UPDATE SET subgenre_id = EXCLUDED.subgenre_id, confidence = EXCLUDED.confidence, updated_at = now()
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

    // Primary subgenre + parent genre
    const g = await sql/* sql */`
      SELECT g.slug AS genre_slug, g.name AS genre_name, sg.slug AS subgenre_slug, sg.name AS subgenre_name
      FROM book_primary_subgenres bps
      JOIN subgenres sg ON sg.id = bps.subgenre_id
      JOIN genres g ON g.id = sg.genre_id
      WHERE bps.book_id = ${resolvedId}
      LIMIT 1
    ` as Array<{ genre_slug: string; genre_name: string; subgenre_slug: string; subgenre_name: string }>;

    // Cross tags
    const tags = await sql/* sql */`
      SELECT ct.slug, ct.name, ct."group"
      FROM book_cross_tags bct
      JOIN cross_tags ct ON ct.id = bct.cross_tag_id
      WHERE bct.book_id = ${resolvedId}
      ORDER BY ct."group" ASC, ct.name ASC
    ` as Array<{ slug: string; name: string; group: string }>;

    const data = {
      genre: g[0] ? { slug: g[0].genre_slug, name: g[0].genre_name } : undefined,
      subgenre: g[0] ? { slug: g[0].subgenre_slug, name: g[0].subgenre_name } : undefined,
      tags,
      allTagCount: tags.length,
    };

    return res.status(200).json({ ok: true, data });
  } catch (error: any) {
    console.error("book-taxonomy error", error);
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to load taxonomy" });
  }
}
