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
    const [genres, subgenres, tags] = await Promise.all([
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
      `
    ]);

    return res.status(200).json({
      genres,
      subgenres,
      tags,
      format: null, // TODO: implement format lookup
      audience: null // TODO: implement audience lookup
    });
  } catch (error: any) {
    console.error('Failed to load book taxonomy:', error);
    return res.status(500).json({ error: 'Failed to load book taxonomy', details: error.message });
  }
}
