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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const googleBooksId = typeof req.query.googleBooksId === "string" ? req.query.googleBooksId : null;
    const bookId = typeof req.query.bookId === "string" ? req.query.bookId : null;
    if (!googleBooksId && !bookId) {
      return res.status(400).json({ ok: false, error: "googleBooksId or bookId is required" });
    }

    const sql = getSql();

    // Resolve internal book ID
    const bookRow = googleBooksId
      ? (await sql/* sql */`SELECT id FROM books WHERE google_books_id = ${googleBooksId} LIMIT 1`) as Array<{ id: string }>
      : (await sql/* sql */`SELECT id FROM books WHERE id = ${bookId} LIMIT 1`) as Array<{ id: string }>;

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

