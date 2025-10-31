import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { upsertBook, type BookInput } from "../lib/user-books-db";
import { detectTaxonomy } from "../../shared/taxonomy";
import { neon } from "@neondatabase/serverless";

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

    // Dual-write: create work and edition (best-effort; skip on failure)
    try {
      const { createWorkFromBook } = await import("../lib/editions-api");
      await createWorkFromBook({
        id: ingested.id,
        title: ingested.title,
        authors: ingested.authors ?? [],
        description: ingested.description ?? null,
        publishedDate: ingested.publishedDate ?? null,
        isbn: ingested.isbn ?? null,
        coverUrl: ingested.coverUrl ?? null,
        googleBooksId: ingested.googleBooksId ?? null,
        pageCount: ingested.pageCount ?? null,
        categories: ingested.categories ?? null,
      });
    } catch (e) {
      // Swallow edition creation errors to keep ingest fast and resilient
      console.warn("[ingest] work/edition creation skipped:", (e as any)?.message ?? e);
    }

    // Attempt to apply taxonomy (best-effort; skip on failure)
    try {
      const sql = neon(process.env.DATABASE_URL!);
      const { primarySubgenre, crossTags } = detectTaxonomy(
        ingested.title,
        ingested.description,
        ingested.categories
      );

      // Upsert primary subgenre
      if (primarySubgenre) {
        const sub = (await sql/* sql */`SELECT id FROM subgenres WHERE slug = ${primarySubgenre} LIMIT 1`) as Array<{ id: string }>;
        const subId = sub[0]?.id;
        if (subId) {
          await sql/* sql */`
            INSERT INTO book_primary_subgenres (book_id, subgenre_id, confidence)
            VALUES (${ingested.id}, ${subId}, ${0.8})
            ON CONFLICT (book_id)
            DO UPDATE SET subgenre_id = EXCLUDED.subgenre_id, confidence = EXCLUDED.confidence, updated_at = now()
          `;
        }
      }

      // Upsert cross tags (cap at 20)
      for (const slug of crossTags.slice(0, 20)) {
        const tag = (await sql/* sql */`SELECT id FROM cross_tags WHERE slug = ${slug} LIMIT 1`) as Array<{ id: string }>;
        const tagId = tag[0]?.id;
        if (!tagId) continue;
        await sql/* sql */`
          INSERT INTO book_cross_tags (book_id, cross_tag_id, confidence)
          VALUES (${ingested.id}, ${tagId}, ${0.7})
          ON CONFLICT (book_id, cross_tag_id)
          DO NOTHING
        `;
      }
    } catch (e) {
      // Swallow taxonomy errors to keep ingest fast and resilient
      console.warn("[ingest] taxonomy assignment skipped:", (e as any)?.message ?? e);
    }

    return res.status(200).json(ingested);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }

    console.error("Failed to ingest book:", error);
    return res.status(500).json({ error: "Failed to ingest book" });
  }
}
