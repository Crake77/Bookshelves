import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const googleBooksId = req.query.googleBooksId as string;
    if (!googleBooksId) {
      return res.status(400).json({ error: 'googleBooksId query parameter required' });
    }

    const sql = neon(process.env.DATABASE_URL!);
    
    // Get book ID
    const bookRows = await sql`SELECT id FROM books WHERE google_books_id = ${googleBooksId}`;
    if (bookRows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const bookId = bookRows[0].id;

    // Fetch book's taxonomy
    const [
      genres,
      subgenres,
      tags,
      tagCount,
      formats,
      audiences,
    ] = await Promise.all([
      sql`
        SELECT g.id, g.slug, g.name 
        FROM book_genres bg
        JOIN genres g ON g.id = bg.genre_id
        WHERE bg.book_id = ${bookId}
      `,
      sql`
        SELECT s.id, s.slug, s.name
        FROM book_subgenres bs
        JOIN subgenres s ON s.id = bs.subgenre_id
        WHERE bs.book_id = ${bookId}
      `,
      sql`
        SELECT ct.id, ct.slug, ct.name, ct."group"
        FROM book_cross_tags bct
        JOIN cross_tags ct ON ct.id = bct.cross_tag_id
        WHERE bct.book_id = ${bookId}
        ORDER BY ct.name
        LIMIT 12
      `,
      sql`
        SELECT COUNT(*) as count
        FROM book_cross_tags bct
        WHERE bct.book_id = ${bookId}
      `,
      sql`
        SELECT f.id, f.slug, f.name
        FROM book_formats bf
        JOIN formats f ON f.id = bf.format_id
        WHERE bf.book_id = ${bookId}
      `,
      sql`
        SELECT am.id, am.slug, am.name
        FROM book_age_markets bam
        JOIN age_markets am ON am.id = bam.age_market_id
        WHERE bam.book_id = ${bookId}
      `
    ]);

    const primaryGenre = genres[0] ?? null;
    const primarySubgenre = subgenres[0] ?? null;
    const primaryFormat = formats[0]
      ? { slug: formats[0].slug, name: formats[0].name }
      : undefined;
    const primaryAudience = audiences[0]
      ? { slug: audiences[0].slug, name: audiences[0].name }
      : undefined;

    const data = {
      genres,
      subgenres,
      tags,
      allTagCount: tagCount.length > 0 ? Number.parseInt(tagCount[0].count) : 0,
      format: primaryFormat,
      ageMarket: primaryAudience,
      audience: primaryAudience,
      genre: primaryGenre,
      subgenre: primarySubgenre,
    };

    return res.status(200).json({ ok: true, data });
  } catch (error: any) {
    console.error('Failed to load book taxonomy:', error);
    return res.status(500).json({ error: 'Failed to load book taxonomy', details: error.message });
  }
}
