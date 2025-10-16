import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { upsertBook, type BookInput } from "./user-books/db.js";

const ingestSchema = z.object({
  googleBooksId: z.string().min(1, "googleBooksId is required"),
  title: z.string().min(1, "title is required"),
  authors: z.array(z.string()).optional(),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  publishedDate: z.string().optional(),
  pageCount: z.number().int().nonnegative().optional(),
  categories: z.array(z.string()).optional(),
  isbn: z.string().optional(),
});

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch (error) {
      console.warn("Failed to parse /api/ingest body", error);
      return {};
    }
  }
  return req.body as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const body = parseBody(req);
    const parsed = ingestSchema.parse(body) as BookInput;

    const ingested = await upsertBook(parsed);
    return res.status(200).json(ingested);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }

    console.error("Failed to ingest book:", error);
    return res.status(500).json({ error: "Failed to ingest book" });
  }
}
