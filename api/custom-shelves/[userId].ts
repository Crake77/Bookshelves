// api/custom-shelves/[userId].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Temporary stub that returns an empty list of custom shelves for a user.
 * This matches your existing client call shape: /api/custom-shelves/:userId
 * We'll replace this with real DB logic next.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = String((req.query?.userId ?? '')).trim();

  if (!userId) {
    return res.status(400).json({ message: 'Missing userId' });
  }

  // TODO: replace with DB fetch
  // Example shape your UI likely expects: [{ id, name, order, createdAt }, ...]
  const shelves: any[] = [];

  return res.status(200).json(shelves);
}
