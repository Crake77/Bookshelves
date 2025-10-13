// api/custom-shelves/[userId].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, ensureSchema, ensureDefaultShelves } from '../_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = String(req.query?.userId ?? '').trim();
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  try {
    const sql = getSql();

    // Ensure tables/default rows exist
    await ensureSchema(sql);
    await ensureDefaultShelves(sql, userId);

    // Query shelves for this user
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

    const shelves = rows.map((row) => ({
      id: String((row as Record<string, unknown>).id),
      name: String((row as Record<string, unknown>).name ?? ''),
      position: Number((row as Record<string, unknown>).position ?? 0),
      createdAt: String((row as Record<string, unknown>).createdAt ?? ''),
    }));

    return res.status(200).json(shelves);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('custom-shelves error:', err);
    return res.status(500).json({ message: 'DB error', error: errorMessage });
  }
}
