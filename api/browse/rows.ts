import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUBJECTS = [
  { id: 'fantasy', label: 'Popular in Fantasy' },
  { id: 'science_fiction', label: 'Trending in Sci-Fi' },
  { id: 'mystery', label: 'Mystery & Thrillers' },
  { id: 'historical_fiction', label: 'Historical Fiction' },
  { id: 'romance', label: 'Romance Picks' }
];

function mapEntry(e: any) {
  const coverId = e.cover_id ?? (e.covers && e.covers[0]) ?? null;
  const cover = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
  const author =
    (e.authors && e.authors[0] && (e.authors[0].name || e.authors[0].author?.key)) || null;
  return { id: e.key, title: e.title, author, cover };
}

async function fetchSubject(subject: string, limit = 20) {
  const r = await fetch(`https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=${limit}`);
  if (!r.ok) throw new Error(`subject ${subject} ${r.status}`);
  const data = await r.json();
  return (data.works || []).map(mapEntry);
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = await Promise.all(
      SUBJECTS.map(async (s) => ({
        id: s.id,
        title: s.label,
        items: await fetchSubject(s.id, 20)
      }))
    );
    return res.status(200).json({ rows });
  } catch (e: any) {
    return res.status(500).json({ message: 'browse failed', error: String(e?.message || e) });
  }
}
