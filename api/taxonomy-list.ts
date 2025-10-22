import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL env var");
  return neon(url);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).end("Method Not Allowed");
    }
    const q = (typeof req.query.q === "string" ? req.query.q : "").trim();
    // Allow larger limits for client dialogs that need comprehensive options.
    // Browse/settings subgenre/tag pickers request up to 500 to keep lists complete.
    const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 20)));
    const sql = getSql();

    const like = q ? `%${q.toLowerCase()}%` : null;

    const genres = (await sql/* sql */`
      SELECT slug, name
      FROM genres
      WHERE enabled = true
        AND (${like}::text IS NULL OR LOWER(name) LIKE ${like})
      ORDER BY name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string }>;

    const subgenres = (await sql/* sql */`
      SELECT sg.slug as slug, sg.name as name, g.slug as genre_slug, g.name as genre_name
      FROM subgenres sg
      JOIN genres g ON g.id = sg.genre_id
      WHERE sg.enabled = true AND g.enabled = true
        AND (${like}::text IS NULL OR LOWER(sg.name) LIKE ${like} OR LOWER(g.name) LIKE ${like})
      ORDER BY sg.name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string; genre_slug: string; genre_name: string }>;

    const tags = (await sql/* sql */`
      SELECT slug, name, "group"
      FROM cross_tags
      WHERE enabled = true
        AND (${like}::text IS NULL OR LOWER(name) LIKE ${like} OR LOWER("group") LIKE ${like})
      ORDER BY name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string; group: string }>;

    const domains = (await sql/* sql */`
      SELECT slug, name
      FROM domains
      WHERE enabled = true
        AND (${like}::text IS NULL OR LOWER(name) LIKE ${like})
      ORDER BY name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string }>;

    const supergenres = (await sql/* sql */`
      SELECT slug, name, description
      FROM supergenres
      WHERE enabled = true
        AND (${like}::text IS NULL OR LOWER(name) LIKE ${like})
      ORDER BY name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string; description: string | null }>;

    const formats = (await sql/* sql */`
      SELECT slug, name, description
      FROM formats
      WHERE enabled = true
        AND (${like}::text IS NULL OR LOWER(name) LIKE ${like})
      ORDER BY name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string; description: string | null }>;

    const ageMarkets = (await sql/* sql */`
      SELECT slug, name, min_age, max_age
      FROM age_markets
      WHERE enabled = true
        AND (${like}::text IS NULL OR LOWER(name) LIKE ${like})
      ORDER BY min_age ASC NULLS LAST, name ASC
      LIMIT ${limit}
    `) as Array<{ slug: string; name: string; min_age: number | null; max_age: number | null }>;

    return res.status(200).json({ 
      ok: true, 
      domains,
      supergenres,
      genres, 
      subgenres, 
      formats,
      ageMarkets,
      tags 
    });
  } catch (error: any) {
    console.error("taxonomy-list error", error);
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to load taxonomy list" });
  }
}
