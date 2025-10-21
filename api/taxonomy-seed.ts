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

  // Link tables (safe to create even if unused yet)
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS book_primary_subgenres (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      subgenre_id uuid NOT NULL REFERENCES subgenres(id) ON DELETE CASCADE,
      confidence real,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_book_primary_subgenre_book UNIQUE (book_id)
    )`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS book_subgenre_candidates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      subgenre_id uuid NOT NULL REFERENCES subgenres(id) ON DELETE CASCADE,
      confidence real NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_book_subgenre_candidate UNIQUE (book_id, subgenre_id)
    )`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS book_cross_tags (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      cross_tag_id uuid NOT NULL REFERENCES cross_tags(id) ON DELETE CASCADE,
      confidence real,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_book_cross_tag UNIQUE (book_id, cross_tag_id)
    )`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS book_age_markets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      age_market_id uuid NOT NULL REFERENCES age_markets(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_book_age_market UNIQUE (book_id, age_market_id)
    )`;

  // Indexes (idempotent)
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_genres_enabled_true ON genres (enabled) WHERE enabled = true`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_subgenres_genre ON subgenres (genre_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_subgenres_enabled_true ON subgenres (enabled) WHERE enabled = true`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_cross_tags_group ON cross_tags ("group")`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_cross_tags_enabled_true ON cross_tags (enabled) WHERE enabled = true`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_age_markets_enabled_true ON age_markets (enabled) WHERE enabled = true`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bps_book ON book_primary_subgenres (book_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bps_subgenre ON book_primary_subgenres (subgenre_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bsc_book ON book_subgenre_candidates (book_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bsc_subgenre ON book_subgenre_candidates (subgenre_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bct_book ON book_cross_tags (book_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bct_crosstag ON book_cross_tags (cross_tag_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bam_book ON book_age_markets (book_id)`;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_bam_age_market ON book_age_markets (age_market_id)`;
}

const GENRES: Array<{ slug: string; name: string; enabled?: boolean }> = [
  { slug: "fiction", name: "Fiction" },
  { slug: "nonfiction", name: "Nonfiction" },
  { slug: "poetry", name: "Poetry" },
  { slug: "drama", name: "Drama" },
  { slug: "comics-graphic", name: "Comics & Graphic" },
  { slug: "anthologies", name: "Anthologies" },
  // Elevate Romance to a first-class genre so we can manage its
  // rich subgenre tree independently from general Fiction.
  { slug: "romance", name: "Romance" },
];

const SUBGENRES: Array<{ parent: string; slug: string; name: string; enabled?: boolean }> = [
  // fiction
  { parent: "fiction", slug: "literary-fiction", name: "Literary Fiction" },
  { parent: "fiction", slug: "contemporary-fiction", name: "Contemporary Fiction" },
  { parent: "fiction", slug: "historical-fiction", name: "Historical Fiction" },
  { parent: "fiction", slug: "romance", name: "Romance" },
  { parent: "fiction", slug: "mystery", name: "Mystery" },
  { parent: "fiction", slug: "cozy-mystery", name: "Cozy Mystery" },
  { parent: "fiction", slug: "crime-detective", name: "Crime & Detective" },
  { parent: "fiction", slug: "police-procedural", name: "Police Procedural" },
  { parent: "fiction", slug: "forensic-crime", name: "Forensic Crime" },
  { parent: "fiction", slug: "hard-boiled", name: "Hard-Boiled" },
  { parent: "fiction", slug: "thriller", name: "Thriller" },
  { parent: "fiction", slug: "legal-thriller", name: "Legal Thriller" },
  { parent: "fiction", slug: "psychological-thriller", name: "Psychological Thriller" },
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
  { parent: "fiction", slug: "world-war-i", name: "World War I" },
  { parent: "fiction", slug: "world-war-ii", name: "World War II" },
  { parent: "fiction", slug: "vietnam-war", name: "Vietnam War" },
  { parent: "fiction", slug: "western", name: "Western" },
  { parent: "fiction", slug: "weird-western", name: "Weird Western" },
  { parent: "fiction", slug: "family-saga", name: "Family Saga" },
  { parent: "fiction", slug: "domestic-drama", name: "Domestic Drama" },
  { parent: "fiction", slug: "medical-drama", name: "Medical Drama" },
  { parent: "fiction", slug: "legal-drama", name: "Legal Drama" },
  { parent: "fiction", slug: "new-adult-fiction", name: "New Adult Fiction" },
  { parent: "fiction", slug: "quarter-life", name: "Quarter-Life" },
  { parent: "fiction", slug: "sports-fiction", name: "Sports Fiction" },
  { parent: "fiction", slug: "baseball-fiction", name: "Baseball Fiction" },
  { parent: "fiction", slug: "football-fiction", name: "Football Fiction" },
  { parent: "fiction", slug: "basketball-fiction", name: "Basketball Fiction" },
  { parent: "fiction", slug: "pirate-adventure", name: "Pirate Adventure" },
  { parent: "fiction", slug: "naval-fiction", name: "Naval Fiction" },
  { parent: "fiction", slug: "maritime-survival", name: "Maritime Survival" },
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
  { parent: "poetry", slug: "ode", name: "Ode" },
  { parent: "poetry", slug: "elegy", name: "Elegy" },
  { parent: "poetry", slug: "villanelle", name: "Villanelle" },
  { parent: "poetry", slug: "pastoral", name: "Pastoral" },
  { parent: "poetry", slug: "prose-poetry", name: "Prose Poetry" },
  { parent: "poetry", slug: "slam-poetry", name: "Slam Poetry" },
  // drama
  { parent: "drama", slug: "tragedy", name: "Tragedy" },
  { parent: "drama", slug: "comedy", name: "Comedy" },
  { parent: "drama", slug: "historical-drama", name: "Historical Drama" },
  { parent: "drama", slug: "melodrama", name: "Melodrama" },
  { parent: "drama", slug: "absurdist", name: "Absurdist" },
  { parent: "drama", slug: "one-act", name: "One-Act" },
  { parent: "drama", slug: "screenplay-teleplay", name: "Screenplay/Teleplay" },
  { parent: "drama", slug: "farce", name: "Farce" },
  { parent: "drama", slug: "tragicomedy", name: "Tragicomedy" },
  { parent: "drama", slug: "dramedy", name: "Dramedy" },
  { parent: "drama", slug: "opera-libretto", name: "Opera Libretto" },
  { parent: "drama", slug: "musical-theatre", name: "Musical Theatre" },
  { parent: "drama", slug: "one-person-show", name: "One-Person Show" },
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
  { parent: "comics-graphic", slug: "graphic-novel-horror", name: "Graphic Novel — Horror" },
  { parent: "comics-graphic", slug: "graphic-novel-romance", name: "Graphic Novel — Romance" },
  { parent: "comics-graphic", slug: "graphic-novel-mystery", name: "Graphic Novel — Mystery" },
  // anthologies
  { parent: "anthologies", slug: "short-story-collection", name: "Short Story Collection" },
  { parent: "anthologies", slug: "novella", name: "Novella" },
  { parent: "anthologies", slug: "multi-author-anthology", name: "Multi-Author Anthology" },
  { parent: "anthologies", slug: "themed-anthology", name: "Themed Anthology" },
  { parent: "anthologies", slug: "best-of-year", name: "Best of the Year" },
  { parent: "anthologies", slug: "single-author-collection", name: "Single Author Collection" },
  { parent: "anthologies", slug: "regional-anthology", name: "Regional Anthology" },
  { parent: "anthologies", slug: "genre-mashup-anthology", name: "Genre Mash-up Anthology" },
  { parent: "anthologies", slug: "flash-fiction-anthology", name: "Flash Fiction Anthology" },
  { parent: "anthologies", slug: "novellette-collection", name: "Novelette Collection" },
  // romance (industry-common subgenres)
  { parent: "romance", slug: "contemporary-romance", name: "Contemporary Romance" },
  { parent: "romance", slug: "historical-romance", name: "Historical Romance" },
  { parent: "romance", slug: "regency-romance", name: "Regency Romance" },
  { parent: "romance", slug: "romantic-suspense", name: "Romantic Suspense" },
  { parent: "romance", slug: "paranormal-romance", name: "Paranormal Romance" },
  { parent: "romance", slug: "fantasy-romance", name: "Fantasy Romance" },
  { parent: "romance", slug: "science-fiction-romance", name: "Science Fiction Romance" },
  { parent: "romance", slug: "romantic-comedy", name: "Romantic Comedy" },
  { parent: "romance", slug: "dark-romance", name: "Dark Romance" },
  { parent: "romance", slug: "sports-romance", name: "Sports Romance" },
  { parent: "romance", slug: "medical-romance", name: "Medical Romance" },
  { parent: "romance", slug: "military-romance", name: "Military Romance" },
  { parent: "romance", slug: "inspirational-romance", name: "Inspirational/Christian Romance" },
  { parent: "romance", slug: "billionaire-romance", name: "Billionaire Romance" },
  { parent: "romance", slug: "royal-romance", name: "Royal Romance" },
  { parent: "romance", slug: "holiday-romance", name: "Holiday Romance" },
  { parent: "romance", slug: "western-cowboy-romance", name: "Western/Cowboy Romance" },
  { parent: "romance", slug: "mafia-romance", name: "Mafia Romance" },
  { parent: "romance", slug: "motorcycle-club-romance", name: "Motorcycle Club (MC) Romance" },
  { parent: "romance", slug: "urban-romance", name: "Urban Romance" },
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
  { group: "setting", slug: "summer-camp", name: "Summer Camp" },
  { group: "setting", slug: "wilderness-forest", name: "Wilderness/Forest" },
  // structure
  { group: "structure", slug: "epistolary", name: "Epistolary" },
  { group: "structure", slug: "multiple-pov", name: "Multiple POV" },
  { group: "structure", slug: "nonlinear", name: "Nonlinear" },
  { group: "structure", slug: "dual-timeline", name: "Dual Timeline" },
  { group: "structure", slug: "serial-episodic", name: "Serial/Episodic" },
  { group: "structure", slug: "frame-narrative", name: "Frame Narrative" },
  { group: "structure", slug: "unreliable-narrator", name: "Unreliable Narrator" },
  // tropes_themes
  { group: "tropes_themes", slug: "found-family", name: "Found Family" },
  { group: "tropes_themes", slug: "enemies-to-lovers", name: "Enemies to Lovers" },
  { group: "tropes_themes", slug: "friends-to-lovers", name: "Friends to Lovers" },
  { group: "tropes_themes", slug: "rivals-to-lovers", name: "Rivals to Lovers" },
  { group: "tropes_themes", slug: "second-chance", name: "Second Chance" },
  { group: "tropes_themes", slug: "slow-burn", name: "Slow Burn" },
  { group: "tropes_themes", slug: "insta-love", name: "Insta-Love" },
  { group: "tropes_themes", slug: "fake-dating", name: "Fake Dating" },
  { group: "tropes_themes", slug: "marriage-of-convenience", name: "Marriage of Convenience" },
  { group: "tropes_themes", slug: "forced-proximity", name: "Forced Proximity" },
  { group: "tropes_themes", slug: "coming-of-age", name: "Coming of Age" },
  { group: "tropes_themes", slug: "love-triangle", name: "Love Triangle" },
  { group: "tropes_themes", slug: "arranged-marriage", name: "Arranged Marriage" },
  { group: "tropes_themes", slug: "grumpy-sunshine", name: "Grumpy/Sunshine" },
  { group: "tropes_themes", slug: "secret-relationship", name: "Secret Relationship" },
  { group: "tropes_themes", slug: "forbidden-love", name: "Forbidden Love" },
  { group: "tropes_themes", slug: "age-gap", name: "Age Gap" },
  { group: "tropes_themes", slug: "best-friends-sibling", name: "Best Friend’s Sibling" },
  { group: "tropes_themes", slug: "sibling-best-friend", name: "Sibling’s Best Friend" },
  { group: "tropes_themes", slug: "only-one-bed", name: "Only One Bed" },
  { group: "tropes_themes", slug: "mistaken-identity", name: "Mistaken Identity" },
  { group: "tropes_themes", slug: "pen-pals", name: "Pen Pals" },
  { group: "tropes_themes", slug: "soulmates", name: "Soulmates" },
  { group: "tropes_themes", slug: "amnesia", name: "Amnesia" },
  { group: "tropes_themes", slug: "secret-baby", name: "Secret Baby" },
  { group: "tropes_themes", slug: "accidental-pregnancy", name: "Accidental Pregnancy" },
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
  { group: "tropes_themes", slug: "missing-persons", name: "Missing Persons" },
  { group: "tropes_themes", slug: "cold-case", name: "Cold Case" },
  { group: "tropes_themes", slug: "police-procedural", name: "Police Procedural" },
  { group: "tropes_themes", slug: "artificial-intelligence", name: "Artificial Intelligence" },
  { group: "tropes_themes", slug: "time-loop", name: "Time Loop" },
  // romance audience and flavors
  { group: "audience", slug: "new-adult", name: "New Adult" },
  { group: "audience", slug: "young-adult", name: "Young Adult" },
  { group: "tropes_themes", slug: "sports-romance", name: "Sports Romance" },
  { group: "tropes_themes", slug: "college-romance", name: "College Romance" },
  { group: "tropes_themes", slug: "rockstar-romance", name: "Rockstar Romance" },
  { group: "tropes_themes", slug: "forbidden-romance", name: "Forbidden Romance" },
  { group: "tropes_themes", slug: "opposites-attract", name: "Opposites Attract" },
  { group: "tropes_themes", slug: "grumpy-sunshine", name: "Grumpy/Sunshine" },
  { group: "tropes_themes", slug: "single-parent", name: "Single Parent" },
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
  { group: "content_flags", slug: "closed-door", name: "Closed Door" },
  { group: "content_flags", slug: "open-door", name: "Open Door" },
  { group: "content_flags", slug: "explicit-steamy", name: "Explicit/Steamy" },
  { group: "content_flags", slug: "kink-bdsm", name: "Kink/BDSM" },
  { group: "content_flags", slug: "non-graphic-violence", name: "Non-graphic Violence" },
  { group: "content_flags", slug: "graphic-violence", name: "Graphic Violence" },
  { group: "content_flags", slug: "strong-language", name: "Strong Language" },
  { group: "content_flags", slug: "mature-themes", name: "Mature Themes" },
  // topics (nonfiction & technical)
  { group: "topic", slug: "programming", name: "Programming" },
  { group: "topic", slug: "software-engineering", name: "Software Engineering" },
  { group: "topic", slug: "game-development", name: "Game Development" },
  { group: "topic", slug: "game-design", name: "Game Design" },
  { group: "topic", slug: "project-management", name: "Project Management" },
  // personal growth & motivation
  { group: "topic", slug: "positive-thinking", name: "Positive Thinking" },
  { group: "topic", slug: "mindset", name: "Mindset" },
  { group: "topic", slug: "habits", name: "Habits" },
  { group: "topic", slug: "motivational", name: "Motivational" },
  { group: "topic", slug: "critical-thinking", name: "Critical Thinking" },
  { group: "topic", slug: "buddhism", name: "Buddhism" },
  { group: "topic", slug: "christianity", name: "Christianity" },
  { group: "topic", slug: "emotional-intelligence", name: "Emotional Intelligence" },
  { group: "topic", slug: "climate-change", name: "Climate Change" },
  { group: "topic", slug: "chess", name: "Chess" },
  { group: "setting", slug: "africa", name: "Africa" },
  { group: "setting", slug: "new-york-city", name: "New York City" },
  { group: "setting", slug: "brooklyn", name: "Brooklyn" },
  { group: "setting", slug: "queens", name: "Queens" },
  { group: "setting", slug: "bronx", name: "Bronx" },
  { group: "setting", slug: "harlem", name: "Harlem" },
  { group: "setting", slug: "los-angeles", name: "Los Angeles" },
  { group: "setting", slug: "london", name: "London" },
  { group: "setting", slug: "paris", name: "Paris" },
  // locations
  { group: "setting", slug: "new-york-city", name: "New York City" },
  { group: "setting", slug: "brooklyn", name: "Brooklyn" },
  // philosophy topics
  { group: "topic", slug: "ethics", name: "Ethics" },
  { group: "topic", slug: "epistemology", name: "Epistemology" },
  { group: "topic", slug: "metaphysics", name: "Metaphysics" },
  { group: "topic", slug: "logic", name: "Logic" },
  { group: "topic", slug: "aesthetics", name: "Aesthetics" },
  { group: "topic", slug: "existentialism", name: "Existentialism" },
  { group: "topic", slug: "stoicism", name: "Stoicism" },
  { group: "topic", slug: "free-will", name: "Free Will" },
  { group: "topic", slug: "consciousness", name: "Consciousness" },
  { group: "topic", slug: "mind-body", name: "Mind-Body" },
  { group: "topic", slug: "phenomenology", name: "Phenomenology" },
  { group: "topic", slug: "political-philosophy", name: "Political Philosophy" },
  { group: "topic", slug: "virtue-ethics", name: "Virtue Ethics" },
  // mathematics topics
  { group: "topic", slug: "mathematics", name: "Mathematics" },
  { group: "topic", slug: "statistics", name: "Statistics" },
  { group: "topic", slug: "probability", name: "Probability" },
  { group: "topic", slug: "number-theory", name: "Number Theory" },
  { group: "topic", slug: "number-theory", name: "Number Theory" },
  { group: "topic", slug: "algebra", name: "Algebra" },
  { group: "topic", slug: "calculus", name: "Calculus" },
  { group: "topic", slug: "geometry", name: "Geometry" },
  // children / early readers / picture books
  { group: "format", slug: "picture-book", name: "Picture Book" },
  { group: "audience", slug: "early-readers", name: "Early Readers" },
  { group: "audience", slug: "beginner-reader", name: "Beginner Reader" },
  { group: "structure", slug: "rhyming-verse", name: "Rhyming Verse" },
  { group: "structure", slug: "nonsense-verse", name: "Nonsense Verse" },
  { group: "topic", slug: "animals", name: "Animals" },
  { group: "topic", slug: "cats", name: "Cats" },
  { group: "tone_mood", slug: "children-humor", name: "Children's Humor" },
  { group: "audience", slug: "ages-5-8", name: "Ages 5–8" },
  // social sciences & law
  { group: "topic", slug: "anthropology", name: "Anthropology" },
  { group: "topic", slug: "sociology", name: "Sociology" },
  { group: "topic", slug: "political-science", name: "Political Science" },
  { group: "topic", slug: "law", name: "Law" },
  { group: "topic", slug: "economics", name: "Economics" },
  { group: "topic", slug: "public-policy", name: "Public Policy" },
  { group: "topic", slug: "government", name: "Government" },
  { group: "topic", slug: "criminal-law", name: "Criminal Law" },
  { group: "topic", slug: "constitutional-law", name: "Constitutional Law" },
  // safety
  { group: "topic", slug: "nonfiction", name: "Nonfiction" },
  
  // === New Crime & Detective tropes ===
  { group: "tropes_themes", slug: "serial-killer", name: "Serial Killer" },
  { group: "tropes_themes", slug: "red-herring", name: "Red Herring" },
  { group: "tropes_themes", slug: "forensic-science", name: "Forensic Science" },
  { group: "tropes_themes", slug: "police-corruption", name: "Police Corruption" },
  { group: "tropes_themes", slug: "legal-drama", name: "Legal Drama" },
  { group: "tropes_themes", slug: "private-investigator", name: "Private Investigator" },
  { group: "tropes_themes", slug: "unsolved-case", name: "Unsolved Case" },
  { group: "tone_mood", slug: "gritty", name: "Gritty" },
  { group: "tone_mood", slug: "cerebral", name: "Cerebral" },
  { group: "setting", slug: "crime-scene", name: "Crime Scene" },
  { group: "setting", slug: "police-station", name: "Police Station" },
  { group: "setting", slug: "detective-office", name: "Detective Office" },
  
  // === Western tropes ===
  { group: "tropes_themes", slug: "gunfight", name: "Gunfight" },
  { group: "tropes_themes", slug: "cattle-drive", name: "Cattle Drive" },
  { group: "tropes_themes", slug: "frontier-justice", name: "Frontier Justice" },
  { group: "tropes_themes", slug: "gold-rush", name: "Gold Rush" },
  { group: "tropes_themes", slug: "train-robbery", name: "Train Robbery" },
  { group: "tropes_themes", slug: "posse", name: "Posse" },
  { group: "tropes_themes", slug: "ranch-life", name: "Ranch Life" },
  { group: "tone_mood", slug: "rugged", name: "Rugged" },
  { group: "tone_mood", slug: "lawless", name: "Lawless" },
  { group: "setting", slug: "frontier-town", name: "Frontier Town" },
  { group: "setting", slug: "prairie", name: "Prairie" },
  { group: "setting", slug: "desert", name: "Desert" },
  { group: "setting", slug: "ranch", name: "Ranch" },
  { group: "setting", slug: "saloon", name: "Saloon" },
  { group: "setting", slug: "mountains", name: "Mountains" },
  
  // === War & Military tropes ===
  { group: "tropes_themes", slug: "battle", name: "Battle" },
  { group: "tropes_themes", slug: "camaraderie", name: "Camaraderie" },
  { group: "tropes_themes", slug: "ptsd", name: "PTSD" },
  { group: "tropes_themes", slug: "heroism", name: "Heroism" },
  { group: "tropes_themes", slug: "sacrifice", name: "Sacrifice" },
  { group: "tropes_themes", slug: "wartime-romance", name: "Wartime Romance" },
  { group: "tropes_themes", slug: "ambush", name: "Ambush" },
  { group: "tropes_themes", slug: "espionage", name: "Espionage" },
  { group: "tone_mood", slug: "tense", name: "Tense" },
  { group: "tone_mood", slug: "tragic", name: "Tragic" },
  { group: "tone_mood", slug: "patriotic", name: "Patriotic" },
  { group: "setting", slug: "battlefield", name: "Battlefield" },
  { group: "setting", slug: "trench", name: "Trench" },
  { group: "setting", slug: "barracks", name: "Barracks" },
  { group: "setting", slug: "warship", name: "Warship" },
  
  // === New Adult tropes ===
  { group: "tropes_themes", slug: "college-life", name: "College Life" },
  { group: "tropes_themes", slug: "first-job", name: "First Job" },
  { group: "tropes_themes", slug: "self-discovery", name: "Self-Discovery" },
  { group: "tropes_themes", slug: "independence", name: "Independence" },
  { group: "tropes_themes", slug: "sexual-exploration", name: "Sexual Exploration" },
  { group: "tropes_themes", slug: "friendship", name: "Friendship" },
  { group: "tone_mood", slug: "angsty", name: "Angsty" },
  { group: "tone_mood", slug: "romantic", name: "Romantic" },
  { group: "tone_mood", slug: "steamy", name: "Steamy" },
  { group: "setting", slug: "college-campus", name: "College Campus" },
  { group: "setting", slug: "first-apartment", name: "First Apartment" },
  { group: "setting", slug: "bars-clubs", name: "Bars/Clubs" },
  { group: "setting", slug: "road-trip", name: "Road Trip" },
  
  // === Sports Fiction tropes ===
  { group: "tropes_themes", slug: "underdog", name: "Underdog" },
  { group: "tropes_themes", slug: "rivalry", name: "Rivalry" },
  { group: "tropes_themes", slug: "championship", name: "Championship" },
  { group: "tropes_themes", slug: "injury", name: "Injury" },
  { group: "tropes_themes", slug: "comeback", name: "Comeback" },
  { group: "tropes_themes", slug: "team-dynamics", name: "Team Dynamics" },
  { group: "tone_mood", slug: "inspiring", name: "Inspiring" },
  { group: "tone_mood", slug: "competitive", name: "Competitive" },
  { group: "tone_mood", slug: "triumphant", name: "Triumphant" },
  { group: "setting", slug: "stadium", name: "Stadium" },
  { group: "setting", slug: "field", name: "Field" },
  { group: "setting", slug: "gym", name: "Gym" },
  { group: "setting", slug: "locker-room", name: "Locker Room" },
  
  // === Nautical tropes ===
  { group: "tropes_themes", slug: "mutiny", name: "Mutiny" },
  { group: "tropes_themes", slug: "treasure-hunt", name: "Treasure Hunt" },
  { group: "tropes_themes", slug: "storm-at-sea", name: "Storm at Sea" },
  { group: "tropes_themes", slug: "shipwreck", name: "Shipwreck" },
  { group: "tropes_themes", slug: "piracy", name: "Piracy" },
  { group: "tone_mood", slug: "adventurous", name: "Adventurous" },
  { group: "tone_mood", slug: "perilous", name: "Perilous" },
  { group: "setting", slug: "ship-deck", name: "Ship Deck" },
  { group: "setting", slug: "open-ocean", name: "Open Ocean" },
  { group: "setting", slug: "tropical-island", name: "Tropical Island" },
  { group: "setting", slug: "harbor", name: "Harbor" },
  
  // === Family Saga & Realistic Fiction tropes ===
  { group: "tropes_themes", slug: "generational-conflict", name: "Generational Conflict" },
  { group: "tropes_themes", slug: "marriage-crisis", name: "Marriage Crisis" },
  { group: "tropes_themes", slug: "mental-illness", name: "Mental Illness" },
  { group: "tropes_themes", slug: "addiction", name: "Addiction" },
  { group: "tropes_themes", slug: "social-issues", name: "Social Issues" },
  { group: "tropes_themes", slug: "resilience", name: "Resilience" },
  { group: "tropes_themes", slug: "immigrant-story", name: "Immigrant Story" },
  { group: "tropes_themes", slug: "secret-past", name: "Secret Past" },
  { group: "tone_mood", slug: "poignant", name: "Poignant" },
  { group: "tone_mood", slug: "introspective", name: "Introspective" },
  { group: "tone_mood", slug: "dramatic", name: "Dramatic" },
  
  // === Content Warnings (sensitive topics) ===
  { group: "content_flags", slug: "sexual-violence", name: "Sexual Violence" },
  { group: "content_flags", slug: "domestic-abuse", name: "Domestic Abuse" },
  { group: "content_flags", slug: "child-abuse", name: "Child Abuse" },
  { group: "content_flags", slug: "suicide", name: "Suicide" },
  { group: "content_flags", slug: "drug-use", name: "Drug Use" },
  { group: "content_flags", slug: "alcohol-abuse", name: "Alcohol Abuse" },
  { group: "content_flags", slug: "animal-cruelty", name: "Animal Cruelty" },
  { group: "content_flags", slug: "racism", name: "Racism" },
  { group: "content_flags", slug: "homophobia", name: "Homophobia" },
  { group: "content_flags", slug: "transphobia", name: "Transphobia" },
  { group: "content_flags", slug: "miscarriage", name: "Miscarriage" },
  { group: "content_flags", slug: "self-harm", name: "Self-Harm" },
  { group: "content_flags", slug: "eating-disorder", name: "Eating Disorder" },
  { group: "content_flags", slug: "kidnapping", name: "Kidnapping" },
  { group: "content_flags", slug: "torture", name: "Torture" },
  { group: "content_flags", slug: "animal-death", name: "Animal Death" },
  { group: "content_flags", slug: "slavery", name: "Slavery" },
  { group: "content_flags", slug: "genocide", name: "Genocide" },
  { group: "content_flags", slug: "war-atrocities", name: "War Atrocities" },
  { group: "content_flags", slug: "terminal-illness", name: "Terminal Illness" },
  { group: "content_flags", slug: "gun-violence", name: "Gun Violence" },
  { group: "content_flags", slug: "poverty", name: "Poverty" },
  { group: "content_flags", slug: "human-trafficking", name: "Human Trafficking" },
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
    // If refresh query param set, run taxonomy refresh batch in the seed endpoint to avoid extra functions
    const refresh = String((req.query?.refresh ?? "")).toLowerCase();
    if (refresh === "1" || refresh === "true") {
      const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 200)));
      const offset = Math.max(0, Number(req.query.offset ?? 0));
      const books = (await sql/* sql */`
        SELECT id, title, description, categories
        FROM books
        ORDER BY title ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as Array<{ id: string; title: string | null; description: string | null; categories: string[] | null }>;

      let updated = 0;
      for (const b of books) {
        const { detectTaxonomy, detectAgeMarketSlug } = await import("../shared/taxonomy.js");
        const { primarySubgenre, crossTags } = detectTaxonomy(b.title ?? undefined, b.description ?? undefined, b.categories ?? undefined);
        if (primarySubgenre) {
          const sub = (await sql/* sql */`SELECT id FROM subgenres WHERE slug = ${primarySubgenre} LIMIT 1`) as Array<{ id: string }>;
          const subId = sub[0]?.id;
          if (subId) {
            await sql/* sql */`
              INSERT INTO book_primary_subgenres (book_id, subgenre_id, confidence)
              VALUES (${b.id}, ${subId}, ${0.8})
              ON CONFLICT (book_id)
              DO UPDATE SET subgenre_id = EXCLUDED.subgenre_id, confidence = EXCLUDED.confidence, updated_at = now()
            `;
          }
        } else {
          await sql/* sql */`DELETE FROM book_primary_subgenres WHERE book_id = ${b.id}`;
        }
        await sql/* sql */`DELETE FROM book_cross_tags WHERE book_id = ${b.id}`;
        for (const slug of crossTags.slice(0, 20)) {
          const tag = (await sql/* sql */`SELECT id FROM cross_tags WHERE slug = ${slug} LIMIT 1`) as Array<{ id: string }>;
          const tagId = tag[0]?.id;
          if (!tagId) continue;
          await sql/* sql */`
            INSERT INTO book_cross_tags (book_id, cross_tag_id, confidence)
            VALUES (${b.id}, ${tagId}, ${0.7})
            ON CONFLICT (book_id, cross_tag_id) DO NOTHING
          `;
        }
        // Refresh age market link to keep one clear signal per book
        await sql/* sql */`DELETE FROM book_age_markets WHERE book_id = ${b.id}`;
        const ageSlug = detectAgeMarketSlug(b.title ?? undefined, b.description ?? undefined, b.categories ?? undefined);
        if (ageSlug) {
          const age = (await sql/* sql */`SELECT id FROM age_markets WHERE slug = ${ageSlug} LIMIT 1`) as Array<{ id: string }>;
          const ageId = age[0]?.id;
          if (ageId) {
            await sql/* sql */`
              INSERT INTO book_age_markets (book_id, age_market_id)
              VALUES (${b.id}, ${ageId})
              ON CONFLICT (book_id, age_market_id) DO NOTHING
            `;
          }
        }
        updated += 1;
      }
      return res.status(200).json({ ok: true, total: books.length, updated, nextOffset: offset + books.length });
    }
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
