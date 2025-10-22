// This file defines heuristic patterns for auto-detecting domains, genres,
// subgenres, and cross‑tags based on book metadata (title, description,
// and category lists). Each exported constant is a regular expression
// designed to find a specific trope, theme, or structural element when
// scanning free‑form text. These heuristics should be used by the
// ingestion pipeline to assign tags automatically. Note that patterns
// include word boundaries (`\b`) to minimize false positives.

/*
 * Domains
 *
 * Although domain assignment is largely handled by manual mapping
 * (Fiction vs. Nonfiction), certain keywords can hint at a nonfiction
 * work. For example, the presence of "memoir", "biography" or
 * "self‑help" in the title/description suggests a nonfiction domain.
 * These patterns can assist in auto‑detecting domain when explicit
 * metadata is missing.
 */
export const NONFICTION_HINTS = /\b(memoir|biography|autobiography|self[-\s]?help|guidebook|history|true\s+story|investigative|reportage)\b/i;

/*
 * Cross‑tag heuristics
 *
 * These patterns detect popular speculative tropes and themes. When a
 * pattern matches the book description, the corresponding tag should
 * be added. These heuristics follow the canonical slugs defined in
 * taxonomy‑seed‑v2.ts. They are not exhaustive but cover many common
 * mechanisms. Feel free to extend this list as new patterns emerge.
 */

// Characters are transported to another world via reincarnation or a portal
export const ISEKAI_PATTERNS = /\b(truck[-\s]?kun|reincarnat(?:ed|ion)|summon(?:ed)?|another\s+world|other[-\s]?world|portal(?:ed)?|transported\s+to|isekai)\b/i;

// GameLit/LitRPG stories that reference game mechanics, levels and stats
export const LITRPG_PATTERNS = /\b(level\s+up|xp|quest|skill\s+tree|cooldown|status\s+window|HUD|party|stats?\b|game[-\s]?like|system\s+message|litrpg|game\s+interface)\b/i;

// Cultivation/Xianxia stories using eastern progression terms
export const CULTIVATION_PATTERNS = /\b(dantian|qi|meridian|sect|cultivation|xianxia|xuanhuan|dao|nascent\s+soul|foundation\s+establishment)\b/i;

// Progression fantasies where characters explicitly grow stronger over time
export const PROGRESSION_PATTERNS = /\b(progress(?:ion)?|level\s+up|tier\s+system|ascending\s+levels|ranking\s+system)\b/i;

// Portal fantasy without reincarnation (physical doorway between worlds)
export const PORTAL_PATTERNS = /\b(wardrobe|mirror|archway|gate|portal\s+opens|door\s+to\s+another\s+world)\b/i;

// Time‑loop stories where events repeat until resolved
export const TIME_LOOP_PATTERNS = /\b(groundhog\s+day|time\s+loop|repeat(?:ing)?\s+day|same\s+day\s+again|stuck\s+in\s+time)\b/i;

// Time‑travel stories referencing travel to the past or future
export const TIME_TRAVEL_PATTERNS = /\b(time\s+travel|travelling\s+through\s+time|back\s+in\s+time|future\s+past|chrononaut|temporal\s+rift|time\s+machine)\b/i;

// Epic or high fantasy signalled by sweeping scope and grand quests
export const EPIC_FANTASY_PATTERNS = /\b(epic\s+fantasy|high\s+fantasy|quest\b.*(save|destroy)|journey\s+across\s+the\s+kingdom|battle\s+for\s+the\s+realm|ancient\s+prophecy)\b/i;

// Cozy mystery hints: amateur sleuthing in small communities with gentle tone
export const COZY_MYSTERY_PATTERNS = /\b(cozy\s+mystery|small\s+town\s+murder|amateur\s+detective|bake\s+shop\s+sleuth|knitting\s+detective|no\s+graphic\s+violence)\b/i;

// Psychological thriller signals: unreliable narrators, paranoia, mind games
export const PSYCHOLOGICAL_THRILLER_PATTERNS = /\b(psychological\s+thriller|cat\s+and\s+mouse|mind\s+game|twist\s+ending|gaslight|paranoia|unreliable\s+narrator|manipulation)\b/i;

// Historical fiction: keywords for specific eras or historical settings
export const HISTORICAL_FICTION_PATTERNS = /\b(Regency|Victorian|Edwardian|WWI|WWII|medieval|ancient\s+Rome|historical\s+fiction|set\s+in\s+the\s+\d{4}s)\b/i;

// Science fiction: technology and futuristic references
export const SCIENCE_FICTION_PATTERNS = /\b(spaceship|time\s+machine|AI|cyberpunk|android|robot|future\s+Earth|space\s+station|post\s+apocalyptic|sci[-\s]?fi)\b/i;

// Romance: central romantic relationship cues
export const ROMANCE_PATTERNS = /\b(romance|love\s+story|relationship|fiance|girlfriend|boyfriend|marriage\s+of\s+convenience|secret\s+baby|love\s+triangle|second\s+chance)\b/i;

/*
 * Age market heuristics
 *
 * Determine likely age category from keywords. For example, if the text
 * mentions high school or teenage characters, it likely belongs to the
 * young adult category. These patterns should be used with caution and
 * manual review when possible.
 */
export const YA_MARKET_PATTERNS = /\b(coming\s+of\s+age|high\s+school|prom|teenager|YA\b|young\s+adult|first\s+love|identity\s+crisis)\b/i;
export const MIDDLE_GRADE_PATTERNS = /\b(middle\s+grade|MG\b|elementary\s+school|tween|preteen|adventure\s+for\s+kids)\b/i;
export const NEW_ADULT_PATTERNS = /\b(new\s+adult|college\s+life|first\s+job|gap\s+year|quarter[-\s]?life\s+crisis)\b/i;

/*
 * Format heuristics
 *
 * Identify structural formats from descriptions. For example, "graphic
 * novel" or "web serial" will trigger the appropriate format tag. These
 * patterns can feed into format assignment in the database.
 */
export const GRAPHIC_NOVEL_PATTERNS = /\b(graphic\s+novel|illustrated\s+story|sequential\s+art|graphic\s+memoir)\b/i;
export const MANGA_PATTERNS = /\b(manga|tankobon|shonen|shojo|seinen|josei|manhwa|manhua|webtoon)\b/i;
export const SERIAL_WEB_PATTERNS = /\b(web\s+serial|web\s+fiction|serialised\s+online|chapter\s+updates|ongoing\s+web\s+story)\b/i;

// Helper type to map patterns to canonical slugs
export interface HeuristicMapping {
  slug: string;
  pattern: RegExp;
}

// Aggregate heuristics for export. Each entry associates a canonical tag
// slug with its corresponding pattern. These can be iterated over when
// scanning book metadata.
export const HEURISTIC_MAPPINGS: HeuristicMapping[] = [
  { slug: 'isekai', pattern: ISEKAI_PATTERNS },
  { slug: 'litrpg-system', pattern: LITRPG_PATTERNS },
  // Map cultivation patterns to the generic 'cultivation' tag rather than the xianxia subgenre
  { slug: 'cultivation', pattern: CULTIVATION_PATTERNS },
  { slug: 'progression', pattern: PROGRESSION_PATTERNS },
  { slug: 'portal', pattern: PORTAL_PATTERNS },
  { slug: 'time-loop', pattern: TIME_LOOP_PATTERNS },
  { slug: 'time-travel', pattern: TIME_TRAVEL_PATTERNS },
  { slug: 'cozy-mystery', pattern: COZY_MYSTERY_PATTERNS },
  { slug: 'psychological-thriller', pattern: PSYCHOLOGICAL_THRILLER_PATTERNS },
  { slug: 'historical-fiction', pattern: HISTORICAL_FICTION_PATTERNS },
  { slug: 'science-fiction', pattern: SCIENCE_FICTION_PATTERNS },
  { slug: 'romance', pattern: ROMANCE_PATTERNS },
  // Removed epic-fantasy and age/format mappings. These categories are now handled by direct subgenre or format assignment rather than tag inference.
];

// Future patterns can be added below. When adding new entries, ensure that
// their canonical slugs exist in taxonomy-seed-v2.ts and update
// HEURISTIC_MAPPINGS accordingly.