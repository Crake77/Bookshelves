// api/user-books/[userId].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Temporary stub for /api/user-books/:userId
 * GET: returns an empty list (so the UI can load)
 * POST: echoes back a fake created record
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = String(req.query?.userId ?? '').trim();
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  if (req.method === 'GET') {
    // TODO: replace with real DB query later
    return res.status(200).json([]);
  }

  if (req.method === 'POST') {
    // Accept a minimal payload and return a fake created object
    const payload = (req.body ?? {}) as Record<string, any>;
    const now = new Date().toISOString();
    const created = {
      id: 'temp_' + Math.random().toString(36).slice(2),
      userId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return res.status(201).json(created);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
