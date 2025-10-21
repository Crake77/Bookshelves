// shared/mappings/category-to-subgenre.ts
// Subject/category phrase → subgenre slug mappings (explicit, prefer before heuristics).

export type CategoryToSubgenre = {
  match: RegExp;
  slug: string;
};

// Keep this list small and precise; broad matches are handled by heuristics.
export const CATEGORY_TO_SUBGENRE: CategoryToSubgenre[] = [
  // Fantasy
  { match: /\burban fantasy\b/i, slug: "fantasy-urban" },
  { match: /\b(epic|high) fantasy\b/i, slug: "fantasy-epic-high" },
  { match: /\bportal fantasy\b/i, slug: "fantasy-portal" },
  { match: /\bgrimdark\b/i, slug: "grimdark" },
  { match: /\bmagical realism\b/i, slug: "magical-realism" },

  // Science Fiction
  { match: /\bspace opera\b/i, slug: "science-fiction-space-opera" },
  { match: /\bhard sci[-\s]?fi|hard science fiction\b/i, slug: "science-fiction-hard" },
  { match: /\bcyberpunk\b/i, slug: "cyberpunk" },
  { match: /\bdystopian\b/i, slug: "dystopian" },
  { match: /\bpost[-\s]?apocalypt/i, slug: "post-apocalyptic" },
  { match: /\btime travel\b/i, slug: "time-travel" },
  { match: /\balternate history\b/i, slug: "alternate-history" },
  { match: /\bsteampunk\b/i, slug: "steampunk" },

  // Mystery/Thriller/Crime
  { match: /\bmystery\b/i, slug: "mystery" },
  { match: /\bdetective|noir\b/i, slug: "crime-detective" },
  { match: /\bthriller\b/i, slug: "thriller" },
  { match: /\blegal thriller\b/i, slug: "legal-thriller" },
  { match: /\bspy|espionage\b/i, slug: "spy-espionage" },

  // Romance
  { match: /\bromance\b/i, slug: "romance" },

  // Horror
  { match: /\bhorror\b/i, slug: "horror" },

  // Historical
  { match: /\bhistorical fiction\b/i, slug: "historical-fiction" },

  // Nonfiction — Technology & Computing
  { match: /\btechnology\b/i, slug: "technology" },
  { match: /\bcomputers?\b/i, slug: "technology" },
  { match: /\bcomputer science\b/i, slug: "technology" },
  { match: /\bprogramming|coding|software development\b/i, slug: "technology" },
  { match: /\bsoftware engineering\b/i, slug: "technology" },
  { match: /\bgame\s*(?:dev|development)|game design|video games?\b/i, slug: "technology" },

  // Nonfiction — Personal Growth & Humanities
  { match: /\bself[-\s]?help\b/i, slug: "self-help" },
  { match: /\bproductivity\b/i, slug: "productivity" },
  { match: /\bpsychology\b/i, slug: "psychology" },
  { match: /\bphilosophy\b/i, slug: "philosophy" },
  { match: /\breligion|spirituality\b/i, slug: "religion-spirituality" },

  // Nonfiction — General categories (mapped to existing subgenres)
  { match: /\bbiography & autobiography|autobiography\b/i, slug: "autobiography" },
  { match: /\bbiography\b/i, slug: "biography" },
  { match: /\bmemoir\b/i, slug: "memoir" },
  { match: /\bhistory\b/i, slug: "history" },
  { match: /\bbusiness\b/i, slug: "business-economics" },
  { match: /\beconomics\b/i, slug: "business-economics" },
  { match: /\bfinance|personal finance\b/i, slug: "personal-finance" },
  { match: /\beducation|language arts & disciplines\b/i, slug: "education-teaching" },
  { match: /\bhealth(?:\s*&\s*|\s*and\s*)fitness\b/i, slug: "health-fitness" },
  { match: /\bscience\b/i, slug: "science" },
  { match: /\bnature\b/i, slug: "nature-environment" },
  { match: /\bcooking|cookery|food writing\b/i, slug: "cooking-food-writing" },
  { match: /\bfamily(?:\s*&\s*|\s*and\s*)relationships|interpersonal relations|parenting\b/i, slug: "parenting-family" },
  { match: /\btravel\b/i, slug: "travel" },
  { match: /\bessays|literary criticism\b/i, slug: "essays" },
  { match: /\bart(?:\s*&\s*|\s*and\s*)architecture\b/i, slug: "art-architecture" },
  { match: /\barchitecture\b/i, slug: "art-architecture" },
  { match: /\bart\b/i, slug: "art-architecture" },
  { match: /\bmusic\b/i, slug: "music" },
  { match: /\bfilm|media studies|performing arts\b/i, slug: "film-media-studies" },
  { match: /\bsports|recreation\b/i, slug: "sports" },
  { match: /\bgardening|crafts|hobbies|diy\b/i, slug: "crafts-hobbies-diy" },
  { match: /\bpolitical science|public policy|politics\b/i, slug: "politics-public-policy" },
  { match: /\bcurrent affairs|journalism\b/i, slug: "journalism-current-affairs" },

  // Further Nonfiction normalizations
  { match: /\bjuvenile\s+nonfiction\b/i, slug: "education-teaching" },
  { match: /\bbody,?\s*mind\s*&\s*spirit\b/i, slug: "religion-spirituality" },
  { match: /\bself\b/i, slug: "self-help" },
  { match: /\blaw\b/i, slug: "politics-public-policy" },
  { match: /\banthropology\b/i, slug: "history" },
  { match: /\bcritical thinking\b/i, slug: "philosophy" },
  { match: /\bchild development\b/i, slug: "parenting-family" },
  { match: /\bmusical instruments\b/i, slug: "music" },
  { match: /\bforeign language study\b/i, slug: "education-teaching" },
  { match: /\bclimatic changes|climate change\b/i, slug: "nature-environment" },
  { match: /\bpresidents|singers|chess players\b/i, slug: "biography" },
  { match: /\bnew age movement\b/i, slug: "religion-spirituality" },
  { match: /\bslaves\b/i, slug: "history" },
  { match: /\bbrain\b/i, slug: "science" },
  { match: /\bspaghetti westerns\b/i, slug: "film-media-studies" },
  { match: /\bdrama\b/i, slug: "film-media-studies" },
  { match: /\bapperception|ethnopsychology|gerontology|emotions|body image|femininity\b/i, slug: "psychology" },
];
