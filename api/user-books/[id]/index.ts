import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ensureDemoUserSeed,
  listUserBooks,
  updateUserBookStatus,
  removeUserBook,
} from "../db.js";
} from "../../../server/lib/user-books-db.js";

function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function getBody(req: VercelRequest): Record<string, unknown> {
  const body = req.body;
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch (error) {
      console.warn("Failed to parse request body as JSON", error);
      return {};
    }
  }
  return body as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idOrUserId = String(req.query?.id ?? "").trim();
  if (!idOrUserId) {
    return sendError(res, 400, "Missing identifier");
  }

  if (req.method === "GET") {
    await ensureDemoUserSeed(idOrUserId);

    const statusParam = Array.isArray(req.query?.status)
      ? req.query.status[0]
      : (req.query?.status as string | undefined);

    const userBooks = await listUserBooks(idOrUserId, statusParam);
    return res.status(200).json(userBooks);
  }

  if (req.method === "PATCH") {
    const body = getBody(req);
    if (!Object.prototype.hasOwnProperty.call(body, "status")) {
      return sendError(res, 400, "status is required");
    }

    const rawStatus = (body as { status: unknown }).status;
    if (rawStatus !== null && typeof rawStatus !== "string") {
      return sendError(res, 400, "status must be string or null");
    }

    const normalizedStatus =
      rawStatus === null || rawStatus === "" ? null : (rawStatus as string);

    const updated = await updateUserBookStatus(idOrUserId, normalizedStatus);
    if (!updated) {
      return sendError(res, 404, "User book not found");
    }

    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    const removed = await removeUserBook(idOrUserId);
    if (!removed) {
      return sendError(res, 404, "User book not found");
    }
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).end("Method Not Allowed");
}
