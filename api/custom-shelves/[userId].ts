import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureDemoUserSeed } from "../../server/lib/user-books-db.js";

const DEFAULT_SHELVES = [
  { id: "reading", name: "Reading", position: 0, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "completed", name: "Completed", position: 1, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "on-hold", name: "On Hold", position: 2, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "dropped", name: "Dropped", position: 3, createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "plan-to-read", name: "Plan to Read", position: 4, createdAt: "2024-01-01T00:00:00.000Z" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = String(req.query?.userId ?? "").trim();
  if (!userId) {
    return res.status(400).json({ message: "Missing userId" });
  }

  await ensureDemoUserSeed(userId);

  // Future: read actual custom shelves from persistent store.
  // For the preview build we serve the default shelf configuration.
  return res.status(200).json(DEFAULT_SHELVES);
}
