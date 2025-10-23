import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // STUB: Return empty taxonomy for any book
  // Books in batch 1 don't have taxonomy data yet
  return res.status(200).json({
    genres: [],
    subgenres: [],
    tags: [],
    format: null,
    audience: null
  });
}
