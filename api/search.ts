import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { BookSearchResult } from '../shared/types';

function mapWork(w: any): BookSearchResult {
  const coverId = w.cover_i ?? w.cover_id ?? null;
  const cover = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
  return {
    id: w.key,
    title: w.title ?? null,
    author: (w.author_name && w.author_name[0]) || null,
    year: w.first_publish_year || null,
    cover
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = String(req.query.q ?? '').trim();
  const page = Number(req.query.page ?? 1);
  if (!q) return res.status(400).json({ message: 'Missing q' });

  try {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', q);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '20');

    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`openlibrary search ${r.status}`);
    const data = await r.json();

    const items = (data.docs || []).map(mapWork);
    return res.status(200).json({ items, total: data.numFound || items.length, page });
  } catch (e: any) {
    return res.status(500).json({ message: 'search failed', error: String(e?.message || e) });
  }
}
