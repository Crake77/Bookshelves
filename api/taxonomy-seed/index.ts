import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // STUB: Taxonomy seeding disabled during batch 1-3 validation
  return res.status(503).json({ 
    error: "Taxonomy seeding temporarily disabled",
    message: "Taxonomy system will be enabled after batch validation"
  });
}
