import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateUserBookRating } from "../db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).end("Method Not Allowed");
  }

  const userBookId = String(req.query?.id ?? "").trim();
  if (!userBookId) {
    return res.status(400).json({ error: "Missing userBookId" });
  }

  let rawBody: unknown = req.body;
  if (typeof req.body === "string") {
    try {
      rawBody = JSON.parse(req.body);
    } catch (error) {
      console.warn("Failed to parse rating payload", error);
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { rating } = (rawBody ?? {}) as { rating?: number };
  if (typeof rating !== "number" || Number.isNaN(rating)) {
    return res.status(400).json({ error: "rating must be a number" });
  }
  if (rating < 0 || rating > 100) {
    return res.status(400).json({ error: "rating must be between 0 and 100" });
  }

  const updated = await updateUserBookRating(userBookId, rating);
  if (!updated) {
    return res.status(404).json({ error: "User book not found" });
  }
  return res.status(200).json(updated);
}
