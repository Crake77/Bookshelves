import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Fetch all taxonomy data
    const [genres, subgenres, tags, formats, audiences, domains, supergenres] = await Promise.all([
      sql`SELECT id, slug, name, description, enabled FROM genres WHERE enabled = true ORDER BY name`,
      sql`SELECT id, genre_id, slug, name, description, enabled FROM subgenres WHERE enabled = true ORDER BY name`,
      sql`SELECT id, "group", slug, name, description, enabled FROM cross_tags WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, description, enabled FROM formats WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, min_age, max_age, enabled FROM age_markets WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, enabled FROM domains WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, description, enabled FROM supergenres WHERE enabled = true ORDER BY name`
    ]);

    return res.status(200).json({
      genres,
      subgenres,
      tags,
      formats,
      audiences,
      domains,
      supergenres
    });
  } catch (error: any) {
    console.error('Failed to load taxonomy:', error);
    return res.status(500).json({ error: 'Failed to load taxonomy', details: error.message });
  }
}
