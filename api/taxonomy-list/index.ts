import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // STUB: Return empty taxonomy until we seed the taxonomy tables
  // This prevents the UI from breaking when trying to edit carousel filters
  return res.status(200).json({
    genres: [],
    subgenres: [],
    tags: [],
    formats: [],
    audiences: [],
    domains: [],
    supergenres: []
  });
}
