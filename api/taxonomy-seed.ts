import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

function getSql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL env var");
  }
  return neon(url);
}

async function ensureTaxonomySchema(sql: SqlClient) {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

  // Core taxonomy tables
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS genres (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS subgenres (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      genre_id uuid NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS cross_tags (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "group" text NOT NULL,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS age_markets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
}

const GENRES: Array<{ slug: string; name: string; enabled?: boolean }> = [
  { slug: "fiction", name: "Fiction" },
  { slug: "nonfiction", name: "Nonfiction" },
  { slug: "poetry", name: "Poetry" },
  { slug: "drama", name: "Drama" },
  { slug: "comics-graphic", name: "Comics & Graphic" },
  { slug: "anthologies", name: "Anthologies" },
];

const SUBGENRES: Array<{ parent: string; slug: string; name: string; enabled?: boolean }> = [
  // fiction
  { parent: "fiction", slug: "literary-fiction", name: "Literary Fiction" },
  { parent: "fiction", slug: "contemporary-fiction", name: "Contemporary Fiction" },
  { parent: "fiction", slug: "historical-fiction", name: "Historical Fiction" },
  { parent: "fiction", slug: "romance", name: "Romance" },
  { parent: "fiction", slug: "mystery", name: "Mystery" },
  { parent: "fiction", slug: "crime-detective", name: "Crime & Detective" },
  { parent: "fiction", slug: "thriller", name: "Thriller" },
  { parent: "fiction", slug: "legal-thriller", name: "Legal Thriller" },
  { parent: "fiction", slug: "spy-espionage", name: "Spy & Espionage" },
  { parent: "fiction", slug: "horror", name: "Horror" },
  { parent: "fiction", slug: "gothic", name: "Gothic" },
  { parent: "fiction", slug: "fantasy-epic-high", name: "Fantasy — Epic/High" },
  { parent: "fiction", slug: "fantasy-urban", name: "Fantasy — Urban" },
  { parent: "fiction", slug: "fantasy-portal", name: "Fantasy — Portal" },
  { parent: "fiction", slug: "grimdark", name: "Grimdark" },
  { parent: "fiction", slug: "magical-realism", name: "Magical Realism" },
  { parent: "fiction", slug: "supernatural-paranormal", name: "Supernatural & Paranormal" },
  { parent: "fiction", slug: "science-fiction-hard", name: "Science Fiction — Hard" },
  { parent: "fiction", slug: "science-fiction-space-opera", name: "Science Fiction — Space Opera" },
  { parent: "fiction", slug: "cyberpunk", name: "Cyberpunk" },
  { parent: "fiction", slug: "dystopian", name: "Dystopian" },
  { parent: "fiction", slug: "post-apocalyptic", name: "Post-Apocalyptic" },
  { parent: "fiction", slug: "time-travel", name: "Time Travel" },
  { parent: "fiction", slug: "alternate-history", name: "Alternate History" },
  { parent: "fiction", slug: "steampunk", name: "Steampunk" },
  { parent: "fiction", slug: "military-fiction", name: "Military Fiction" },
  { parent: "fiction", slug: "western", name: "Western" },
  { parent: "fiction", slug: "family-saga", name: "Family Saga" },
  { parent: "fiction", slug: "satire", name: "Satire" },
  { parent: "fiction", slug: "action-adventure", name: "Action & Adventure" },
  // nonfiction
  { parent: "nonfiction", slug: "biography", name: "Biography" },
  { parent: "nonfiction", slug: "autobiography", name: "Autobiography" },
  { parent: "nonfiction", slug: "memoir", name: "Memoir" },
  { parent: "nonfiction", slug: "history", name: "History" },
  { parent: "nonfiction", slug: "military-history", name: "Military History" },
  { parent: "nonfiction", slug: "true-crime", name: "True Crime" },
  { parent: "nonfiction", slug: "journalism-current-affairs", name: "Journalism & Current Affairs" },
  { parent: "nonfiction", slug: "politics-public-policy", name: "Politics & Public Policy" },
  { parent: "nonfiction", slug: "business-economics", name: "Business & Economics" },
  { parent: "nonfiction", slug: "personal-finance", name: "Personal Finance" },
  { parent: "nonfiction", slug: "self-help", name: "Self-Help" },
  { parent: "nonfiction", slug: "productivity", name: "Productivity" },
  { parent: "nonfiction", slug: "psychology", name: "Psychology" },
  { parent: "nonfiction", slug: "philosophy", name: "Philosophy" },
  { parent: "nonfiction", slug: "religion-spirituality", name: "Religion & Spirituality" },
  { parent: "nonfiction", slug: "theology", name: "Theology" },
  { parent: "nonfiction", slug: "science", name: "Science" },
  { parent: "nonfiction", slug: "nature-environment", name: "Nature & Environment" },
  { parent: "nonfiction", slug: "technology", name: "Technology" },
  { parent: "nonfiction", slug: "health-fitness", name: "Health & Fitness" },
  { parent: "nonfiction", slug: "nutrition-diet", name: "Nutrition & Diet" },
  { parent: "nonfiction", slug: "medicine", name: "Medicine" },
  { parent: "nonfiction", slug: "education-teaching", name: "Education & Teaching" },
  { parent: "nonfiction", slug: "travel", name: "Travel" },
  { parent: "nonfiction", slug: "essays", name: "Essays" },
  { parent: "nonfiction", slug: "art-architecture", name: "Art & Architecture" },
  { parent: "nonfiction", slug: "music", name: "Music" },
  { parent: "nonfiction", slug: "film-media-studies", name: "Film & Media Studies" },
  { parent: "nonfiction", slug: "sports", name: "Sports" },
  { parent: "nonfiction", slug: "parenting-family", name: "Parenting & Family" },
  { parent: "nonfiction", slug: "crafts-hobbies-diy", name: "Crafts, Hobbies & DIY" },
  { parent: "nonfiction", slug: "cooking-food-writing", name: "Cooking & Food Writing" },
  // poetry
  { parent: "poetry", slug: "lyric", name: "Lyric" },
  { parent: "poetry", slug: "narrative", name: "Narrative" },
  { parent: "poetry", slug: "epic", name: "Epic" },
  { parent: "poetry", slug: "haiku-tanka", name: "Haiku & Tanka" },
  { parent: "poetry", slug: "spoken-word", name: "Spoken Word" },
  { parent: "poetry", slug: "sonnet", name: "Sonnet" },
  { parent: "poetry", slug: "free-verse", name: "Free Verse" },
  { parent: "poetry", slug: "anthology", name: "Anthology" },
  // drama
  { parent: "drama", slug: "tragedy", name: "Tragedy" },
  { parent: "drama", slug: "comedy", name: "Comedy" },
  { parent: "drama", slug: "historical-drama", name: "Historical Drama" },
  { parent: "drama", slug: "melodrama", name: "Melodrama" },
  { parent: "drama", slug: "absurdist", name: "Absurdist" },
  { parent: "drama", slug: "one-act", name: "One-Act" },
  { parent: "drama", slug: "screenplay-teleplay", name: "Screenplay/Teleplay" },
  // comics-graphic
  { parent: "comics-graphic", slug: "superhero", name: "Superhero" },
  { parent: "comics-graphic", slug: "slice-of-life", name: "Slice of Life" },
  { parent: "comics-graphic", slug: "graphic-memoir", name: "Graphic Memoir" },
  { parent: "comics-graphic", slug: "manga-shonen", name: "Manga — Shonen" },
  { parent: "comics-graphic", slug: "manga-seinen", name: "Manga — Seinen" },
  { parent: "comics-graphic", slug: "manga-shojo", name: "Manga — Shojo" },
  { parent: "comics-graphic", slug: "manga-josei", name: "Manga — Josei" },
  { parent: "comics-graphic", slug: "webtoon", name: "Webtoon" },
  { parent: "comics-graphic", slug: "bd-european-comics", name: "BD — European Comics" },
  { parent: "comics-graphic", slug: "graphic-novel-fantasy", name: "Graphic Novel — Fantasy" },
  { parent: "comics-graphic", slug: "graphic-novel-sf", name: "Graphic Novel — SF" },
  { parent: "comics-graphic", slug: "graphic-novel-nonfiction", name: "Graphic Novel — Nonfiction" },
  // anthologies
  { parent: "anthologies", slug: "short-story-collection", name: "Short Story Collection" },
  { parent: "anthologies", slug: "novella", name: "Novella" },
  { parent: "anthologies", slug: "multi-author-anthology", name: "Multi-Author Anthology" },
  { parent: "anthologies", slug: "themed-anthology", name: "Themed Anthology" },
];

const CROSS_TAGS: Array<{ group: string; slug: string; name: string; enabled?: boolean }> = [
  // tone_mood
  { group: "tone_mood", slug: "cozy", name: "Cozy" },
  { group: "tone_mood", slug: "dark", name: "Dark" },
  { group: "tone_mood", slug: "hopepunk", name: "Hopepunk" },
  { group: "tone_mood", slug: "grim", name: "Grim" },
  { group: "tone_mood", slug: "uplifting", name: "Uplifting" },
  { group: "tone_mood", slug: "humorous", name: "Humorous" },
  { group: "tone_mood", slug: "whimsical", name: "Whimsical" },
  { group: "tone_mood", slug: "philosophical", name: "Philosophical" },
  { group: "tone_mood", slug: "suspenseful", name: "Suspenseful" },
  { group: "tone_mood", slug: "heartwarming", name: "Heartwarming" },
  { group: "tone_mood", slug: "bleak", name: "Bleak" },
  { group: "tone_mood", slug: "noir", name: "Noir" },
  // setting
  { group: "setting", slug: "small-town", name: "Small Town" },
  { group: "setting", slug: "big-city", name: "Big City" },
  { group: "setting", slug: "rural", name: "Rural" },
  { group: "setting", slug: "academy-school", name: "Academy/School" },
  { group: "setting", slug: "workplace", name: "Workplace" },
  { group: "setting", slug: "courtroom", name: "Courtroom" },
  { group: "setting", slug: "medical-hospital", name: "Medical/Hospital" },
  { group: "setting", slug: "island", name: "Island" },
  { group: "setting", slug: "closed-circle", name: "Closed Circle" },
  { group: "setting", slug: "space", name: "Space" },
  { group: "setting", slug: "off-world", name: "Off-World" },
  { group: "setting", slug: "post-collapse", name: "Post-Collapse" },
  { group: "setting", slug: "alternate-earth", name: "Alternate Earth" },
  { group: "setting", slug: "secondary-world", name: "Secondary World" },
  { group: "setting", slug: "historical-ancient", name: "Historical — Ancient" },
  { group: "setting", slug: "historical-medieval", name: "Historical — Medieval" },
  { group: "setting", slug: "historical-regency", name: "Historical — Regency" },
  { group: "setting", slug: "historical-victorian", name: "Historical — Victorian" },
  { group: "setting", slug: "historical-wwi", name: "Historical — WWI" },
  { group: "setting", slug: "historical-wwii", name: "Historical — WWII" },
  { group: "setting", slug: "near-future", name: "Near Future" },
  // structure
  { group: "structure", slug: "epistolary", name: "Epistolary" },
  { group: "structure", slug: "multiple-pov", name: "Multiple POV" },
  { group: "structure", slug: "nonlinear", name: "Nonlinear" },
  { group: "structure", slug: "serial-episodic", name: "Serial/Episodic" },
  { group: "structure", slug: "frame-narrative", name: "Frame Narrative" },
  { group: "structure", slug: "unreliable-narrator", name: "Unreliable Narrator" },
  // tropes_themes
  { group: "tropes_themes", slug: "found-family", name: "Found Family" },
  { group: "tropes_themes", slug: "enemies-to-lovers", name: "Enemies to Lovers" },
  { group: "tropes_themes", slug: "friends-to-lovers", name: "Friends to Lovers" },
  { group: "tropes_themes", slug: "second-chance", name: "Second Chance" },
  { group: "tropes_themes", slug: "slow-burn", name: "Slow Burn" },
  { group: "tropes_themes", slug: "coming-of-age", name: "Coming of Age" },
  { group: "tropes_themes", slug: "heist", name: "Heist" },
  { group: "tropes_themes", slug: "quest", name: "Quest" },
  { group: "tropes_themes", slug: "locked-room", name: "Locked Room" },
  { group: "tropes_themes", slug: "court-intrigue", name: "Court Intrigue" },
  { group: "tropes_themes", slug: "political-maneuvering", name: "Political Maneuvering" },
  { group: "tropes_themes", slug: "survival", name: "Survival" },
  { group: "tropes_themes", slug: "redemption", name: "Redemption" },
  { group: "tropes_themes", slug: "faith", name: "Faith" },
  { group: "tropes_themes", slug: "ethics-morality", name: "Ethics & Morality" },
  { group: "tropes_themes", slug: "technology-and-society", name: "Technology & Society" },
  { group: "tropes_themes", slug: "colonization", name: "Colonization" },
  { group: "tropes_themes", slug: "first-contact", name: "First Contact" },
  { group: "tropes_themes", slug: "artificial-intelligence", name: "Artificial Intelligence" },
  { group: "tropes_themes", slug: "time-loop", name: "Time Loop" },
  { group: "tropes_themes", slug: "game-like-systems-litrpg", name: "Game-like Systems / LitRPG" },
  { group: "tropes_themes", slug: "cultivation-progression", name: "Cultivation / Progression" },
  { group: "tropes_themes", slug: "system-apocalypse", name: "System Apocalypse" },
  // format
  { group: "format", slug: "audiobook-original", name: "Audiobook Original" },
  { group: "format", slug: "illustrated", name: "Illustrated" },
  { group: "format", slug: "epic-length-600p", name: "Epic Length (600p+)" },
  { group: "format", slug: "novella-length", name: "Novella Length" },
  { group: "format", slug: "serial-web", name: "Serial/Web" },
  { group: "format", slug: "omnibus", name: "Omnibus" },
  // content_flags
  { group: "content_flags", slug: "clean", name: "Clean" },
  { group: "content_flags", slug: "fade-to-black-romance", name: "Fade-to-Black Romance" },
  { group: "content_flags", slug: "non-graphic-violence", name: "Non-graphic Violence" },
  { group: "content_flags", slug: "graphic-violence", name: "Graphic Violence" },
  { group: "content_flags", slug: "strong-language", name: "Strong Language" },
  { group: "content_flags", slug: "mature-themes", name: "Mature Themes" },
];

const AGE_MARKETS: Array<{ slug: string; name: string; enabled?: boolean }> = [
  { slug: "adult", name: "Adult" },
  { slug: "new-adult-18-25", name: "New Adult (18–25)" },
  { slug: "young-adult-12-18", name: "Young Adult (12–18)" },
  { slug: "middle-grade-8-12", name: "Middle Grade (8–12)" },
  { slug: "children-8-12", name: "Children (8–12)" },
  { slug: "early-readers-5-8", name: "Early Readers (5–8)" },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const sql = getSql();
    await ensureTaxonomySchema(sql);

    let genreCount = 0;
    let subgenreCount = 0;
    let crossTagCount = 0;
    let ageMarketCount = 0;

    // Upsert genres and capture IDs
    const genreIdBySlug = new Map<string, string>();
    for (const g of GENRES) {
      const [row] = (await sql/* sql */`
        INSERT INTO genres (slug, name, enabled)
        VALUES (${g.slug}, ${g.name}, ${g.enabled ?? true})
        ON CONFLICT (slug)
        DO UPDATE SET name = EXCLUDED.name, enabled = EXCLUDED.enabled, updated_at = now()
        RETURNING id
      `) as Array<{ id: string }>;
      if (row?.id) {
        genreIdBySlug.set(g.slug, row.id);
        genreCount += 1;
      }
    }

    // Upsert subgenres
    for (const s of SUBGENRES) {
      const parentId = genreIdBySlug.get(s.parent);
      if (!parentId) {
        // Try to fetch if not in map (in case of existing rows)
        const found = (await sql/* sql */`SELECT id FROM genres WHERE slug = ${s.parent} LIMIT 1`) as Array<{ id: string }>;
        if (found[0]?.id) genreIdBySlug.set(s.parent, found[0].id);
      }
      const genreId = genreIdBySlug.get(s.parent);
      if (!genreId) continue; // parent missing; skip

      const result = await sql/* sql */`
        INSERT INTO subgenres (genre_id, slug, name, enabled)
        VALUES (${genreId}, ${s.slug}, ${s.name}, ${s.enabled ?? true})
        ON CONFLICT (slug)
        DO UPDATE SET genre_id = EXCLUDED.genre_id, name = EXCLUDED.name, enabled = EXCLUDED.enabled, updated_at = now()
      `;
      if (Array.isArray(result)) {
        subgenreCount += 1;
      }
    }

    // Upsert cross tags
    for (const t of CROSS_TAGS) {
      const result = await sql/* sql */`
        INSERT INTO cross_tags ("group", slug, name, enabled)
        VALUES (${t.group}, ${t.slug}, ${t.name}, ${t.enabled ?? true})
        ON CONFLICT (slug)
        DO UPDATE SET "group" = EXCLUDED."group", name = EXCLUDED.name, enabled = EXCLUDED.enabled, updated_at = now()
      `;
      if (Array.isArray(result)) {
        crossTagCount += 1;
      }
    }

    // Upsert age markets
    for (const a of AGE_MARKETS) {
      const result = await sql/* sql */`
        INSERT INTO age_markets (slug, name, enabled)
        VALUES (${a.slug}, ${a.name}, ${a.enabled ?? true})
        ON CONFLICT (slug)
        DO UPDATE SET name = EXCLUDED.name, enabled = EXCLUDED.enabled, updated_at = now()
      `;
      if (Array.isArray(result)) {
        ageMarketCount += 1;
      }
    }

    return res.status(200).json({
      ok: true,
      seeded: {
        genres: genreCount,
        subgenres: subgenreCount,
        crossTags: crossTagCount,
        ageMarkets: ageMarketCount,
      },
    });
  } catch (error: any) {
    console.error("taxonomy seed error", error);
    return res.status(500).json({ ok: false, error: error?.message ?? "Failed to seed taxonomy" });
  }
}

