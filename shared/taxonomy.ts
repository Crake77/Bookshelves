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
  { slug: "thriller", includes: [/\b(?:thriller|suspense)\b/i] },
  { slug: "romance", includes: [/\bromance\b/i] },
  // Romance heuristic: capture love stories without explicit "romance" keyword
  { slug: "romance", includes: [/\blove (?:story|affair|triangle)\b|\brelationship\b|\bgirlfriend\b|\bboyfriend\b|\bfianc(?:e|é|ée)\b/i] },
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
    { slug: "space", group: "setting", rx: /\b(?:space|starship|interstellar)\b/i },
    { slug: "off-world", group: "setting", rx: /\boff[-\s]?world|exoplanet\b/i },
    { slug: "secondary-world", group: "setting", rx: /\bkingdom|castle|realm|secondary world\b/i },
    { slug: "historical-victorian", group: "setting", rx: /\bvictorian\b/i },
    { slug: "historical-regency", group: "setting", rx: /\bregency\b/i },
    { slug: "historical-medieval", group: "setting", rx: /\bmedieval\b/i },
    { slug: "historical-wwii", group: "setting", rx: /\bworld war\s*ii|wwii\b/i },
    { slug: "near-future", group: "setting", rx: /\bnear[-\s]?future\b/i },
    { slug: "small-town", group: "setting", rx: /\bsmall[-\s]?town\b/i },
    { slug: "big-city", group: "setting", rx: /\bbig[-\s]?city\b/i },
    { slug: "rural", group: "setting", rx: /\brural|countryside\b/i },
    { slug: "summer-camp", group: "setting", rx: /\bsummer\s+camp|campground|camp\s+counsel(?:or|l)\b/i },
    { slug: "wilderness-forest", group: "setting", rx: /\bwilderness|forest|woods|backcountry|national park\b/i },
    // structure
    { slug: "epistolary", group: "structure", rx: /\bdiary|letters|epistolary\b/i },
    { slug: "multiple-pov", group: "structure", rx: /\bmultiple pov|multi[-\s]?pov|alternating pov\b/i },
    { slug: "nonlinear", group: "structure", rx: /\bnon[-\s]?linear|out of order\b/i },
    { slug: "dual-timeline", group: "structure", rx: /\bdual[-\s]?timeline|two\s+timelines|past and present\b/i },
    // tropes_themes
    { slug: "found-family", group: "tropes_themes", rx: /\bfound family\b/i },
    { slug: "enemies-to-lovers", group: "tropes_themes", rx: /\benemies to lovers\b/i },
    { slug: "friends-to-lovers", group: "tropes_themes", rx: /\bfriends to lovers\b/i },
    { slug: "slow-burn", group: "tropes_themes", rx: /\bslow burn\b/i },
    { slug: "coming-of-age", group: "tropes_themes", rx: /\bcoming of age\b/i },
    { slug: "second-chance", group: "tropes_themes", rx: /\bsecond chance\b/i },
    { slug: "heist", group: "tropes_themes", rx: /\bheist\b/i },
    { slug: "quest", group: "tropes_themes", rx: /\bquest\b/i },
    { slug: "locked-room", group: "tropes_themes", rx: /\blocked room\b/i },
    { slug: "court-intrigue", group: "tropes_themes", rx: /\bcourt intrigue\b/i },
    { slug: "political-maneuvering", group: "tropes_themes", rx: /\b(?:political maneuver|political manoeuvre|schem\w*)\b/i },
    { slug: "survival", group: "tropes_themes", rx: /\bsurvival\b/i },
    { slug: "redemption", group: "tropes_themes", rx: /\bredemption\b/i },
    { slug: "first-contact", group: "tropes_themes", rx: /\bfirst contact\b/i },
    { slug: "missing-persons", group: "tropes_themes", rx: /\bmissing (?:girl|boy|child|children|person|persons|people)\b|\b(?:disappeared|vanished)\b/i },
    { slug: "cold-case", group: "tropes_themes", rx: /\bcold\s+case\b/i },
    { slug: "police-procedural", group: "tropes_themes", rx: /\bpolice\s+procedural|homicide\s+detective\b/i },
    // Stricter AI detection: require the explicit phrase to reduce incidental matches
    { slug: "artificial-intelligence", group: "tropes_themes", rx: /\bartificial intelligence\b/i },
    { slug: "time-loop", group: "tropes_themes", rx: /\btime loop\b/i },
    // Narrow LitRPG signal to avoid generic "system" matches
    { slug: "game-like-systems-litrpg", group: "tropes_themes", rx: /\b(?:litrpg|game[-\s]?like systems?|status window|level(?:ing)? system)\b/i },
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

    // topics (nonfiction & technical)
    { slug: "programming", group: "topic", rx: /\bprogramming|coding|write code\b/i },
    { slug: "software-engineering", group: "topic", rx: /\bsoftware (?:engineering|development)\b/i },
    { slug: "game-development", group: "topic", rx: /\bgame\s*(?:dev|development)|video game(?:s)?\b/i },
    { slug: "game-design", group: "topic", rx: /\bgame design\b/i },
    { slug: "project-management", group: "topic", rx: /\bproject management|agile|scrum|kanban\b/i },

    // romance audience and flavors
    { slug: "new-adult", group: "audience", rx: /\bnew\s+adult\b|\bNA\b/i },
    { slug: "young-adult", group: "audience", rx: /\byoung\s+adult\b|\bYA\b/i },
    { slug: "sports-romance", group: "tropes_themes", rx: /\b(?:sports|baseball|football|hockey|basketball)\b.*\bromance\b/i },
    { slug: "college-romance", group: "tropes_themes", rx: /\b(?:college|university)\b.*\bromance\b/i },
    { slug: "rockstar-romance", group: "tropes_themes", rx: /\b(rock\s*star|musician|band)\b.*\bromance\b/i },
    { slug: "forbidden-romance", group: "tropes_themes", rx: /\bforbidden\s+romance\b/i },
    { slug: "opposites-attract", group: "tropes_themes", rx: /\bopposites\s+attract\b/i },
    { slug: "grumpy-sunshine", group: "tropes_themes", rx: /\bgrumpy\s*sunshine\b/i },
    { slug: "single-parent", group: "tropes_themes", rx: /\bsingle\s+(?:mom|mother|dad|father|parent)\b/i },

    // personal growth & motivation
    { slug: "positive-thinking", group: "topic", rx: /\bpositive thinking\b/i },
    { slug: "mindset", group: "topic", rx: /\bmindset\b/i },
    { slug: "habits", group: "topic", rx: /\bhabits?\b/i },
    { slug: "motivational", group: "topic", rx: /\bmotivational|inspirational\b/i },

    // business & career topics
    { slug: "leadership", group: "topic", rx: /\bleadership\b/i },
    { slug: "entrepreneurship", group: "topic", rx: /\bentrepreneur(?:ship)?\b/i },
    { slug: "marketing", group: "topic", rx: /\bmarketing\b/i },
    { slug: "sales", group: "topic", rx: /\bsales\b/i },
    { slug: "communication", group: "topic", rx: /\bcommunication|public speaking|presentation\b/i },
    { slug: "negotiation", group: "topic", rx: /\bnegotiation|negotiate\b/i },
    { slug: "investing", group: "topic", rx: /\binvest(?:ing|ment)s?\b/i },
    { slug: "finance", group: "topic", rx: /\bpersonal finance|budget(?:ing)?|money management\b/i },

    // wellness & lifestyle
    { slug: "mindfulness", group: "topic", rx: /\bmindfulness\b/i },
    { slug: "meditation", group: "topic", rx: /\bmeditation\b/i },
    { slug: "nutrition", group: "topic", rx: /\bnutrition|diet(?:ing)?\b/i },
    { slug: "fitness", group: "topic", rx: /\bfitness|exercise|workout\b/i },
    { slug: "parenting", group: "topic", rx: /\bparenting\b/i },
    { slug: "cooking", group: "topic", rx: /\bcook(?:ing|ery)|recipes?\b/i },

    // creative & tech topics
    { slug: "creativity", group: "topic", rx: /\bcreativit[y|e]\b/i },
    { slug: "design", group: "topic", rx: /\bdesign|ux|user experience|ui\b/i },
    { slug: "data-science", group: "topic", rx: /\bdata science|machine learning|ml\b/i },
    // AI topic: allow explicit phrase or standalone "AI" token; we apply extra gating below
    { slug: "ai", group: "topic", rx: /\bartificial intelligence\b|\bAI\b/ },
    { slug: "python", group: "topic", rx: /\bpython\b/i },
    { slug: "javascript", group: "topic", rx: /\bjavascript|node\.js|react\b/i },
    { slug: "cloud", group: "topic", rx: /\bcloud (?:computing|architecture)|aws|azure|gcp\b/i },
    { slug: "cybersecurity", group: "topic", rx: /\bcybersecurity|security|infosec\b/i },

    // additional nonfiction subjects
    { slug: "critical-thinking", group: "topic", rx: /\bcritical thinking\b/i },
    { slug: "buddhism", group: "topic", rx: /\bbuddhism\b/i },
    { slug: "christianity", group: "topic", rx: /\bchristian(?:ity|\s+living)?\b/i },
    { slug: "emotional-intelligence", group: "topic", rx: /\bemotional intelligence\b/i },
    { slug: "climate-change", group: "topic", rx: /\bclimate change|climatic changes\b/i },
    { slug: "chess", group: "topic", rx: /\bchess\b/i },
    { slug: "africa", group: "setting", rx: /\bafrica\b/i },
    { slug: "new-york-city", group: "setting", rx: /\bnew\s+york(?:\s+city)?\b|\bnyc\b|\bmanhattan\b/i },
    { slug: "brooklyn", group: "setting", rx: /\bbrooklyn\b/i },
    { slug: "queens", group: "setting", rx: /\bqueens\b/i },
    { slug: "bronx", group: "setting", rx: /\bthe\s+bronx|\bbronx\b/i },
    { slug: "harlem", group: "setting", rx: /\bharlem\b/i },
    { slug: "los-angeles", group: "setting", rx: /\blos\s+angeles|\bla\b\.?/i },
    { slug: "london", group: "setting", rx: /\blondon\b/i },
    { slug: "paris", group: "setting", rx: /\bparis\b/i },
    // locations
    { slug: "new-york-city", group: "setting", rx: /\bnew\s+york(?:\s+city)?\b|\bnyc\b|\bmanhattan\b/i },
    { slug: "brooklyn", group: "setting", rx: /\bbrooklyn\b/i },

    // philosophy topics
    { slug: "ethics", group: "topic", rx: /\bethics|ethical\b/i },
    { slug: "epistemology", group: "topic", rx: /\bepistemolog\w*\b/i },
    { slug: "metaphysics", group: "topic", rx: /\bmetaphysic\w*\b/i },
    { slug: "logic", group: "topic", rx: /\blogic\b/i },
    { slug: "aesthetics", group: "topic", rx: /\baesthetics?|esthetics?\b/i },
    { slug: "existentialism", group: "topic", rx: /\bexistential(?:ism)?\b/i },
    { slug: "stoicism", group: "topic", rx: /\bstoic(?:ism)?\b/i },
    { slug: "free-will", group: "topic", rx: /\bfree\s+will\b/i },
    { slug: "consciousness", group: "topic", rx: /\bconsciousness\b/i },
    { slug: "mind-body", group: "topic", rx: /\bmind[-\s]?body\b/i },
    { slug: "phenomenology", group: "topic", rx: /\bphenomenolog\w*\b/i },
    { slug: "political-philosophy", group: "topic", rx: /\bpolitical\s+philosophy\b/i },
    { slug: "virtue-ethics", group: "topic", rx: /\bvirtue(?:\s+ethics)?\b/i },

    // mathematics topics
    { slug: "mathematics", group: "topic", rx: /\bmathematics|math\b/i },
    { slug: "statistics", group: "topic", rx: /\bstatistics|statistical\b/i },
    { slug: "probability", group: "topic", rx: /\bprobabilit[y|ies]|stochastic\b/i },
    { slug: "number-theory", group: "topic", rx: /\bnumber\s+theory\b/i },
    { slug: "algebra", group: "topic", rx: /\balgebra(ic)?\b/i },
    { slug: "calculus", group: "topic", rx: /\bcalculus\b/i },
    { slug: "geometry", group: "topic", rx: /\bgeometry|geometric\b/i },

    // children / early readers / picture books
    { slug: "picture-book", group: "format", rx: /\bpicture[-\s]?book(s)?\b/i },
    { slug: "early-readers", group: "audience", rx: /\b(?:early|beginner)\s+readers?\b|\blearn to read\b|\blevel\s*[1-2]\b|\bstep into reading\b/i },
    { slug: "beginner-reader", group: "audience", rx: /\bbeginner\s+reader\b/i },
    { slug: "rhyming-verse", group: "structure", rx: /\brhym(?:e|ing)\b|\brhymed verse\b/i },
    { slug: "nonsense-verse", group: "structure", rx: /\bnonsense\s+verse\b|\bnonsense\s+rhyme\b|\bnonsense\b/i },
    { slug: "animals", group: "topic", rx: /\banimals?\b/i },
    { slug: "cats", group: "topic", rx: /\bcats?\b/i },
    { slug: "children-humor", group: "tone_mood", rx: /\b(silly|zany|wacky|nonsense)\b/i },
    { slug: "ages-5-8", group: "audience", rx: /\bages?\s*(4|5|6)\s*[-–]\s*(7|8)\b/i },

    // social sciences & law (topics)
    { slug: "anthropology", group: "topic", rx: /\banthropology\b/i },
    { slug: "sociology", group: "topic", rx: /\bsociology|sociological\b/i },
    { slug: "political-science", group: "topic", rx: /\bpolitical\s+science\b/i },
    { slug: "law", group: "topic", rx: /\blaw|legal\b/i },
    { slug: "economics", group: "topic", rx: /\beconom(?:ics|y|ist)s?\b|\bmacro(?:economics)?\b|\bmicro(?:economics)?\b/i },
    { slug: "public-policy", group: "topic", rx: /\bpublic\s+policy|policy[-\s]?making|policymaking\b/i },
    { slug: "government", group: "topic", rx: /\bgovernment|governance|public\s+administration\b/i },
    { slug: "criminal-law", group: "topic", rx: /\bcriminal\s+law\b|\bcriminal\s+justice\b/i },
    { slug: "constitutional-law", group: "topic", rx: /\bconstitutional\s+law\b/i },

    // generic nonfiction safety tag
    { slug: "nonfiction", group: "topic", rx: /\bnon[-\s]?fiction\b/i },
  ];

function textFrom(categories?: string[] | null, title?: string, description?: string) {
  const parts = [title ?? "", description ?? "", ...(categories ?? [])];
  return parts.filter(Boolean).join(" \n");
}

import { CATEGORY_TO_SUBGENRE } from "./mappings/category-to-subgenre.js";

export function detectPrimarySubgenreSlug(
  categories?: string[] | null,
  title?: string,
  description?: string,
): string | undefined {
  // Prefer explicit subject/category → subgenre mapping first
  if (categories && categories.length > 0) {
    const catText = categories.join(" \n");
    for (const entry of CATEGORY_TO_SUBGENRE) {
      if (entry.match.test(catText)) return entry.slug;
    }
  }

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
  const MIN_COUNTS: Partial<Record<string, number>> = {
    // Slightly stricter gating for noisier terms
    ai: 2,
    design: 2,
    creativity: 2,
    communication: 2,
    marketing: 2,
    sales: 2,
    finance: 2,
    'nonfiction': 3,
  };

  // Negative phrases per slug to cut common false positives
  const NEGATIVE: Partial<Record<string, RegExp[]>> = {
    // Avoid tagging AI for unrelated proper nouns or design tools
    ai: [/\bAi\s+Weiwei\b/i, /\bAdobe\s+Illustrator\b/i],
  };

  for (const tag of TAG_KEYWORDS) {
    // Count occurrences using a global, case-insensitive regex built from the pattern
    const rx = new RegExp(tag.rx.source, tag.rx.flags.includes('g') ? tag.rx.flags : tag.rx.flags + 'g');
    const count = (hay.match(rx) || []).length;
    const min = MIN_COUNTS[tag.slug] ?? 1;
    if (count >= min) {
      const neg = NEGATIVE[tag.slug];
      if (neg && neg.some((re) => re.test(hay))) {
        continue;
      }
      seen.add(tag.slug);
      if (seen.size >= 20) break;
    }
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

export function detectAgeMarketSlug(
  title?: string,
  description?: string,
  categories?: string[] | null,
): string | undefined {
  const hay = textFrom(categories, title, description).toLowerCase();
  const has = (re: RegExp) => re.test(hay);
  const cats = (categories ?? []).map(c => c.toLowerCase()).join(" \n");
  const hasCat = (re: RegExp) => re.test(cats);

  if (has(/\bnew\s+adult\b/i)) return 'new-adult-18-25';
  if (has(/\byoung\s+adult\b|\bYA\b/i) || hasCat(/young\s*adult/)) return 'young-adult-12-18';
  if (has(/\bmiddle\s*grade\b|\bMG\b/i) || has(/\bgrades?\s*(4|5|6)\b/i) || has(/\bages?\s*(8|9|10|11|12)\b/i) || hasCat(/middle\s*grade/)) return 'middle-grade-8-12';
  if (has(/\bearly\s*readers?\b/i) || has(/\bkindergarten|pre[-\s]?k|pre\s*k|preschool|toddler\b/i) || has(/\bgrades?\s*(k|1|2)\b/i) || has(/\bages?\s*(3|4|5|6|7|8)\b/i)) return 'early-readers-5-8';
  if (has(/\bchildren'?s\b/i) || hasCat(/children/)) return 'children-8-12';
  // Default to adult only if category indicates nonfiction/fiction and no youth signals
  if ((hasCat(/fiction|nonfiction|biography|history|romance|mystery|thriller|science/) || hay.length > 0) &&
      !has(/\b(young\s+adult|middle\s*grade|early\s*reader|children)\b/i)) {
    return 'adult';
  }
  return undefined;
}
