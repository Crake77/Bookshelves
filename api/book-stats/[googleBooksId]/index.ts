import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // STUB: Return null stats for now
  // Stats are in the database but not exposed via this endpoint yet
  return res.status(200).json({
    averageRating: null,
    totalRatings: 0,
    ranking: null
  });
}
