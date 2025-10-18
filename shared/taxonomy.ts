// shared/taxonomy.ts
// Lightweight taxonomy inference (no LLMs).

export type DetectedTaxonomy = {
  primarySubgenre?: string; // subgenre slug
  crossTags: string[]; // cross_tag slugs
};

const SUBGENRE_PATTERNS: Array<{ slug: string; includes: RegExp[]; excludes?: RegExp[] }> = [
  { slug: "science-fiction-space-opera", includes: [/\bscience fiction\b|\bsci[-\s]?fi\b/i] },
  { slug: "science-fiction-hard", includes: [/\bhard sci/i] },
  { slug: "fantasy-urban", includes: [/\burban fantasy\b/i] },
  { slug: "fantasy-epic-high", includes: [/\bfantasy\b/i], excludes: [/\burban\b/i] },
  { slug: "mystery", includes: [/\bmystery\b/i] },
  { slug: "crime-detective", includes: [/\bdetective\b|\bnoir\b/i] },
  { slug: "thriller", includes: [/\bthriller\b/i] },
  { slug: "romance", includes: [/\bromance\b/i] },
  { slug: "horror", includes: [/\bhorror\b/i] },
  { slug: "historical-fiction", includes: [/\bhistorical\b/i] },
  { slug: "cyberpunk", includes: [/\bcyberpunk\b/i] },
  { slug: "dystopian", includes: [/\bdystop/i] },
  { slug: "post-apocalyptic", includes: [/\bpost[-\s]?apoc/i] },
  { slug: "time-travel", includes: [/\btime travel\b/i] },
  { slug: "alternate-history", includes: [/\balternate history\b/i] },
  { slug: "magical-realism", includes: [/\bmagical realism\b/i] },
];

const TAG_KEYWORDS: Array<{ slug: string; group: string; rx: RegExp }>
  = [
    // tone_mood
    { slug: "cozy", group: "tone_mood", rx: /\bcozy|cosy\b/i },
    { slug: "dark", group: "tone_mood", rx: /\bdark\b/i },
    { slug: "uplifting", group: "tone_mood", rx: /\buplifting\b/i },
    { slug: "humorous", group: "tone_mood", rx: /\bhumou?r|funny\b/i },
    { slug: "whimsical", group: "tone_mood", rx: /\bwhimsic/i },
    { slug: "suspenseful", group: "tone_mood", rx: /\bsuspense|edge of (?:your|his|her|their) seat\b/i },
    { slug: "noir", group: "tone_mood", rx: /\bnoir\b/i },
    { slug: "bleak", group: "tone_mood", rx: /\bbleak\b/i },
    // setting
    { slug: "academy-school", group: "setting", rx: /\bacademy|school|college|university\b/i },
    { slug: "courtroom", group: "setting", rx: /\bcourtroom|trial\b/i },
    { slug: "medical-hospital", group: "setting", rx: /\bhospital|medical\b/i },
    { slug: "island", group: "setting", rx: /\bisland\b/i },
    { slug: "closed-circle", group: "setting", rx: /\bclosed[-\s]?circle|locked room\b/i },
    { slug: "space", group: "setting", rx: /\bspace|starship|interstellar\b/i },
    { slug: "off-world", group: "setting", rx: /\boff[-\s]?world|exoplanet\b/i },
    { slug: "secondary-world", group: "setting", rx: /\bkingdom|castle|realm|secondary world\b/i },
    { slug: "historical-victorian", group: "setting", rx: /\bvictorian\b/i },
    { slug: "historical-regency", group: "setting", rx: /\bregency\b/i },
    { slug: "historical-medieval", group: "setting", rx: /\bmedieval\b/i },
    { slug: "historical-wwii", group: "setting", rx: /\bworld war\s*ii|wwii\b/i },
    { slug: "near-future", group: "setting", rx: /\bnear[-\s]?future\b/i },
    // structure
    { slug: "epistolary", group: "structure", rx: /\bdiary|letters|epistolary\b/i },
    { slug: "multiple-pov", group: "structure", rx: /\bmultiple pov|multi[-\s]?pov|alternating pov\b/i },
    { slug: "nonlinear", group: "structure", rx: /\bnon[-\s]?linear|out of order\b/i },
    // tropes_themes
    { slug: "found-family", group: "tropes_themes", rx: /\bfound family\b/i },
    { slug: "enemies-to-lovers", group: "tropes_themes", rx: /\benemies to lovers\b/i },
    { slug: "friends-to-lovers", group: "tropes_themes", rx: /\bfriends to lovers\b/i },
    { slug: "slow-burn", group: "tropes_themes", rx: /\bslow burn\b/i },
    { slug: "coming-of-age", group: "tropes_themes", rx: /\bcoming of age\b/i },
    { slug: "heist", group: "tropes_themes", rx: /\bheist\b/i },
    { slug: "quest", group: "tropes_themes", rx: /\bquest\b/i },
    { slug: "locked-room", group: "tropes_themes", rx: /\blocked room\b/i },
    { slug: "court-intrigue", group: "tropes_themes", rx: /\bcourt intrigue\b/i },
    { slug: "political-maneuvering", group: "tropes_themes", rx: /\bpolitical maneuver|schem/i },
    { slug: "survival", group: "tropes_themes", rx: /\bsurvival\b/i },
    { slug: "redemption", group: "tropes_themes", rx: /\bredemption\b/i },
    { slug: "first-contact", group: "tropes_themes", rx: /\bfirst contact\b/i },
    { slug: "artificial-intelligence", group: "tropes_themes", rx: /\bA\.I\.|AI|artificial intelligence\b/i },
    { slug: "time-loop", group: "tropes_themes", rx: /\btime loop\b/i },
    { slug: "game-like-systems-litrpg", group: "tropes_themes", rx: /\bLitRPG|system\b/i },
    { slug: "cultivation-progression", group: "tropes_themes", rx: /\bcultivation|progression\b/i },
    { slug: "system-apocalypse", group: "tropes_themes", rx: /\bsystem apocalypse\b/i },
    // format
    { slug: "novella-length", group: "format", rx: /\bnovella\b/i },
    { slug: "omnibus", group: "format", rx: /\bomnibus\b/i },
    { slug: "illustrated", group: "format", rx: /\billustrated\b/i },
    // content flags
    { slug: "strong-language", group: "content_flags", rx: /\bstrong language|explicit language\b/i },
    { slug: "graphic-violence", group: "content_flags", rx: /\bgraphic violence\b/i },
    { slug: "non-graphic-violence", group: "content_flags", rx: /\bnon[-\s]?graphic violence\b/i },
    { slug: "mature-themes", group: "content_flags", rx: /\bmature themes\b/i },
    { slug: "clean", group: "content_flags", rx: /\bclean read\b/i },
  ];

function textFrom(categories?: string[] | null, title?: string, description?: string) {
  const parts = [title ?? "", description ?? "", ...(categories ?? [])];
  return parts.filter(Boolean).join(" \n");
}

export function detectPrimarySubgenreSlug(
  categories?: string[] | null,
  title?: string,
  description?: string,
): string | undefined {
  const hay = textFrom(categories, title, description);
  for (const pattern of SUBGENRE_PATTERNS) {
    const inc = pattern.includes.every((re) => re.test(hay));
    const exc = pattern.excludes ? pattern.excludes.some((re) => re.test(hay)) : false;
    if (inc && !exc) return pattern.slug;
  }
  return undefined;
}

export function detectCrossTagSlugs(
  title?: string,
  description?: string,
  categories?: string[] | null
): string[] {
  const hay = textFrom(categories, title, description);
  const seen = new Set<string>();
  for (const tag of TAG_KEYWORDS) {
    if (tag.rx.test(hay)) seen.add(tag.slug);
    if (seen.size >= 20) break;
  }
  return Array.from(seen);
}

export function detectTaxonomy(
  title?: string,
  description?: string,
  categories?: string[] | null,
): DetectedTaxonomy {
  const primarySubgenre = detectPrimarySubgenreSlug(categories, title, description);
  const crossTags = detectCrossTagSlugs(title, description, categories);
  return { primarySubgenre, crossTags };
}

