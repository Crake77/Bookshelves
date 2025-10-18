import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { addUserBook } from "../../server/lib/user-books-db.js";

const bodySchema = z.object({
  userId: z.string().nonempty(),
  bookId: z.string().nonempty(),
  status: z.union([z.string(), z.null()]).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    let rawBody: unknown = req.body;
    if (typeof req.body === "string") {
      try {
        rawBody = JSON.parse(req.body) as unknown;
      } catch (parseError) {
        console.warn("Failed to parse POST /api/user-books body", parseError);
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const parsed = bodySchema.parse(rawBody);
    const status =
      parsed.status === undefined || parsed.status === null || parsed.status === ""
        ? null
        : parsed.status;

    const created = await addUserBook(parsed.userId, parsed.bookId, status);
    return res.status(201).json(created);
  } catch (error: any) {
    console.error("user-books POST error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }

    return res.status(500).json({ error: "Failed to add book to shelf" });
  }
}
