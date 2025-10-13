// api/custom-shelves/[userId].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, ensureSchema, ensureDefaultShelves } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = String(req.query?.userId ?? '').trim();
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  try {
    // Ensure tables/default rows exist
    await ensureSchema();
    await ensureDefaultShelves(userId);

    // Query shelves for this user
    const sql = getSql();
    const rows = await sql/* sql */`
      SELECT
        id,
        name,
        position,
        created_at AS "createdAt"
      FROM shelves
      WHERE user_id = ${userId}
      ORDER BY position, id;
    `;

    return res.status(200).json(rows);
  } catch (err: any) {
    console.error('custom-shelves error:', err);
    return res.status(500).json({ message: 'DB error', error: String(err?.message || err) });
  }
}
