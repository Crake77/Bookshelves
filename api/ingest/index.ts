import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // STUB: Ingest is disabled during batch 1-3 validation
  // Books should be added via the batch loader scripts
  return res.status(503).json({ 
    error: "Ingestion temporarily disabled for batch validation",
    message: "Please use batch loader scripts to add books"
  });
}
