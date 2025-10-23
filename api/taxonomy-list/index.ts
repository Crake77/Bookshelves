import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Fetch all taxonomy data
    const [genres, subgenres, tags, formats, audiences, domains, supergenres, genreDomainLinks, genreSupergenreLinks] = await Promise.all([
      sql`SELECT id, slug, name, description, enabled FROM genres WHERE enabled = true ORDER BY name`,
      sql`
        SELECT s.id, s.genre_id, s.slug, s.name, s.description, s.enabled, g.slug as genre_slug, g.name as genre_name
        FROM subgenres s
        JOIN genres g ON g.id = s.genre_id
        WHERE s.enabled = true
        ORDER BY s.name
      `,
      sql`SELECT id, "group", slug, name, description, enabled FROM cross_tags WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, description, enabled FROM formats WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, min_age, max_age, enabled FROM age_markets WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, enabled FROM domains WHERE enabled = true ORDER BY name`,
      sql`SELECT id, slug, name, description, enabled FROM supergenres WHERE enabled = true ORDER BY name`,
      sql`
        SELECT g.slug as genre_slug, d.slug as domain_slug
        FROM genre_domain gd
        JOIN genres g ON g.id = gd.genre_id
        JOIN domains d ON d.id = gd.domain_id
        WHERE g.enabled = true AND d.enabled = true
      `,
      sql`
        SELECT g.slug as genre_slug, s.slug as supergenre_slug
        FROM genre_supergenre gs
        JOIN genres g ON g.id = gs.genre_id
        JOIN supergenres s ON s.id = gs.supergenre_id
        WHERE g.enabled = true AND s.enabled = true
      `
    ]);

    return res.status(200).json({
      genres,
      subgenres,
      tags,
      formats,
      ageMarkets: audiences, // Return as ageMarkets to match client expectations
      domains,
      supergenres,
      genreDomainLinks,
      genreSupergenreLinks
    });
  } catch (error: any) {
    console.error('Failed to load taxonomy:', error);
    return res.status(500).json({ error: 'Failed to load taxonomy', details: error.message });
  }
}
