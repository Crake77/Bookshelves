import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverIngestHandler from "../../server/api-handlers/ingest";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.ENABLE_INGEST !== "true") {
    return res.status(503).json({
      error: "Ingestion disabled",
      message: "Set ENABLE_INGEST=true to enable /api/ingest",
    });
  }
  return serverIngestHandler(req, res);
}
