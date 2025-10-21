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
  
  // Crime & Detective
  { slug: "police-procedural", includes: [/\bpolice\s+procedural\b|\bpolice\b.*\binvestigation\b/i] },
  { slug: "legal-thriller", includes: [/\blegal\s+thriller\b|\bcourtroom\s+drama\b/i] },
  { slug: "forensic-crime", includes: [/\bforensic\b.*\bmystery\b|\bCSI\b.*\bcrime\b/i] },
  { slug: "cozy-mystery", includes: [/\bcozy\b.*\bmystery\b/i] },
  { slug: "hard-boiled", includes: [/\bhard[-\s]?boiled\b/i] },
  { slug: "psychological-thriller", includes: [/\bpsychological\b.*\bthriller\b/i] },
  
  // Western
  { slug: "western", includes: [/\bwestern\b|\bOld\s+West\b|\bwild\s+west\b|\bcowboy\b|\bfrontier\b/i] },
  { slug: "weird-western", includes: [/\bweird\s+western\b|\bhorror\s+western\b/i] },
  
  // War & Military
  { slug: "world-war-i", includes: [/\bWorld\s+War\s+I\b|\bFirst\s+World\s+War\b|\bWWI\b/i] },
  { slug: "world-war-ii", includes: [/\bWorld\s+War\s+II\b|\bSecond\s+World\s+War\b|\bWWII\b/i] },
  { slug: "vietnam-war", includes: [/\bVietnam\s+War\b/i] },
  { slug: "military-fiction", includes: [/\bmilitary\s+fiction\b|\bspecial\s+forces\b|\bnaval\s+warfare\b/i] },
  
  // New Adult
  { slug: "new-adult-fiction", includes: [/\bnew\s+adult\b.*\bfiction\b|\bNA\b.*\bfiction\b|\bcollege\b.*\bcoming\s+of\s+age\b/i] },
  { slug: "quarter-life", includes: [/\bquarter\s+life\s+crisis\b|\btwentysomething\b/i] },
  
  // Realistic Fiction & Family Saga
  { slug: "family-saga", includes: [/\bfamily\s+saga\b|\bmulti[-\s]?generational\b/i] },
  { slug: "domestic-drama", includes: [/\bdomestic\b.*\bdrama\b|\bfamily\s+drama\b/i] },
  { slug: "medical-drama", includes: [/\bmedical\b.*\bdrama\b|\bmedical\s+fiction\b/i] },
  { slug: "legal-drama", includes: [/\blegal\b.*\bdrama\b/i] },
  
  // Sports Fiction
  { slug: "sports-fiction", includes: [/\bsports\b.*\bnovel\b|\bathlete\b.*\bstory\b/i] },
  { slug: "baseball-fiction", includes: [/\bbaseball\b.*\bnovel\b/i] },
  { slug: "football-fiction", includes: [/\bfootball\b.*\bnovel\b/i] },
  { slug: "basketball-fiction", includes: [/\bbasketball\b.*\bnovel\b/i] },
  
  // Nautical & Sea
  { slug: "pirate-adventure", includes: [/\bpirate\b.*\badventure\b|\bswashbuckling\b/i] },
  { slug: "naval-fiction", includes: [/\bnaval\b.*\bfiction\b|\bsea\s+battle\b/i] },
  { slug: "maritime-survival", includes: [/\bmaritime\b.*\bsurvival\b|\bcastaway\b/i] },
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
    // content flags (basic)
    { slug: "strong-language", group: "content_flags", rx: /\bstrong language|explicit language\b/i },
    { slug: "graphic-violence", group: "content_flags", rx: /\bgraphic violence\b/i },
    { slug: "non-graphic-violence", group: "content_flags", rx: /\bnon[-\s]?graphic violence\b/i },
    { slug: "mature-themes", group: "content_flags", rx: /\bmature themes\b/i },
    { slug: "clean", group: "content_flags", rx: /\bclean read\b/i },
    
    // content warnings (sensitive topics)
    { slug: "sexual-violence", group: "content_flags", rx: /\bsexual\s+violence\b|\brape\b|\bsexual\s+assault\b/i },
    { slug: "domestic-abuse", group: "content_flags", rx: /\bdomestic\s+abuse\b|\bintimate\s+partner\s+violence\b|\bspousal\s+abuse\b/i },
    { slug: "child-abuse", group: "content_flags", rx: /\bchild\s+abuse\b|\bchild\s+maltreatment\b/i },
    { slug: "suicide", group: "content_flags", rx: /\bsuicide\b|\bsuicidal\b|\bself\s+harming\b/i },
    { slug: "drug-use", group: "content_flags", rx: /\bdrug\s+use\b|\bsubstance\s+abuse\b|\bnarcotics\b|\bdrug\s+addiction\b/i },
    { slug: "alcohol-abuse", group: "content_flags", rx: /\balcohol\s+abuse\b|\balcoholism\b|\bdrinking\s+problem\b/i },
    { slug: "animal-cruelty", group: "content_flags", rx: /\banimal\s+cruelty\b|\banimal\s+abuse\b/i },
    { slug: "racism", group: "content_flags", rx: /\bracism\b|\bracial\s+slur\b|\bwhite\s+supremacy\b/i },
    { slug: "homophobia", group: "content_flags", rx: /\bhomophobia\b|\banti\s+gay\b|\bhomophobic\b/i },
    { slug: "transphobia", group: "content_flags", rx: /\btransphobia\b|\btransphobic\b|\banti\s+trans\b/i },
    { slug: "miscarriage", group: "content_flags", rx: /\bmiscarriage\b|\bstillbirth\b|\bpregnancy\s+loss\b/i },
    { slug: "self-harm", group: "content_flags", rx: /\bself\s+harm\b|\bcutting\b|\bself\s+injury\b/i },
    { slug: "eating-disorder", group: "content_flags", rx: /\beating\s+disorder\b|\banorexia\b|\bbulimia\b/i },
    { slug: "kidnapping", group: "content_flags", rx: /\bkidnapping\b|\babduction\b|\bheld\s+hostage\b/i },
    { slug: "torture", group: "content_flags", rx: /\btorture\b|\bwaterboarding\b/i },
    { slug: "animal-death", group: "content_flags", rx: /\banimal\s+death\b|\bpet\s+dies\b/i },
    { slug: "slavery", group: "content_flags", rx: /\bslavery\b|\benslaved\b/i },
    { slug: "genocide", group: "content_flags", rx: /\bgenocide\b|\bethnic\s+cleansing\b|\bmassacre\b/i },
    { slug: "war-atrocities", group: "content_flags", rx: /\bwar\s+violence\b|\batrocities\b|\bwar\s+crimes\b/i },
    { slug: "terminal-illness", group: "content_flags", rx: /\bterminal\s+illness\b|\bterminal\s+disease\b|\bincurable\b/i },
    { slug: "gun-violence", group: "content_flags", rx: /\bgun\s+violence\b|\bmass\s+shooting\b/i },
    { slug: "poverty", group: "content_flags", rx: /\bpoverty\b|\bhomelessness\b|\bfinancial\s+hardship\b/i },
    { slug: "human-trafficking", group: "content_flags", rx: /\bhuman\s+trafficking\b|\bsex\s+trafficking\b|\bforced\s+labour\b/i },

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
    
    // === Crime & Detective tropes ===
    { slug: "serial-killer", group: "tropes_themes", rx: /\bserial\s+killer\b|\bcopycat\s+killer\b/i },
    { slug: "red-herring", group: "tropes_themes", rx: /\bred\s+herring\b|\bfalse\s+lead\b/i },
    { slug: "forensic-science", group: "tropes_themes", rx: /\bforensic\s+science\b|\bDNA\s+analysis\b/i },
    { slug: "police-corruption", group: "tropes_themes", rx: /\bpolice\s+corruption\b|\bcrooked\s+cop\b/i },
    { slug: "legal-drama", group: "tropes_themes", rx: /\blegal\s+drama\b|\bcourtroom\b.*\bdrama\b/i },
    { slug: "private-investigator", group: "tropes_themes", rx: /\bprivate\s+investigator\b|\bPI\b/i },
    { slug: "unsolved-case", group: "tropes_themes", rx: /\bunsolved\s+case\b/i },
    
    // Crime tone & settings
    { slug: "gritty", group: "tone_mood", rx: /\bgritty\b|\braw\b/i },
    { slug: "cerebral", group: "tone_mood", rx: /\bcerebral\b|\bintellectual\b.*\bwhodunit\b/i },
    { slug: "crime-scene", group: "setting", rx: /\bcrime\s+scene\b|\bmurder\s+scene\b/i },
    { slug: "police-station", group: "setting", rx: /\bpolice\s+station\b|\bprecinct\b/i },
    { slug: "detective-office", group: "setting", rx: /\bdetective\s+office\b|\bPI\s+agency\b/i },
    
    // === Western tropes ===
    { slug: "gunfight", group: "tropes_themes", rx: /\bgunfight\b|\bshootout\b|\bduel\b/i },
    { slug: "cattle-drive", group: "tropes_themes", rx: /\bcattle\s+drive\b|\bherding\b/i },
    { slug: "frontier-justice", group: "tropes_themes", rx: /\bfrontier\s+justice\b|\btake\s+the\s+law\s+into\s+(?:his|her|their)\s+own\s+hands\b/i },
    { slug: "gold-rush", group: "tropes_themes", rx: /\bgold\s+rush\b|\bstriking\s+it\s+rich\b/i },
    { slug: "train-robbery", group: "tropes_themes", rx: /\btrain\s+robbery\b|\bstagecoach\s+heist\b/i },
    { slug: "posse", group: "tropes_themes", rx: /\bposse\b|\blawmen\b|\bdeputies\b/i },
    { slug: "ranch-life", group: "tropes_themes", rx: /\branch\s+life\b|\bhomestead\b/i },
    
    // Western settings & tone
    { slug: "rugged", group: "tone_mood", rx: /\brugged\b|\bhard[-\s]?bitten\b/i },
    { slug: "lawless", group: "tone_mood", rx: /\blawless\b|\bwild\s+frontier\b/i },
    { slug: "frontier-town", group: "setting", rx: /\bfrontier\s+town\b|\bboom\s+town\b/i },
    { slug: "prairie", group: "setting", rx: /\bprairie\b|\bgrassland\b/i },
    { slug: "desert", group: "setting", rx: /\bdesert\b|\bmesa\b/i },
    { slug: "ranch", group: "setting", rx: /\branch\b|\bhomestead\b/i },
    { slug: "saloon", group: "setting", rx: /\bsaloon\b/i },
    { slug: "mountains", group: "setting", rx: /\bmountains\b|\bcanyon\b/i },
    
    // === War & Military tropes ===
    { slug: "battle", group: "tropes_themes", rx: /\bbattle\b|\bskirmish\b|\bcombat\b/i },
    { slug: "camaraderie", group: "tropes_themes", rx: /\bcamaraderie\b|\bbrotherhood\b|\bunit\s+bond\b/i },
    { slug: "ptsd", group: "tropes_themes", rx: /\bshell\s+shock\b|\bPTSD\b|\btrauma\b/i },
    { slug: "heroism", group: "tropes_themes", rx: /\bheroism\b|\bbravery\b|\bvalor\b/i },
    { slug: "sacrifice", group: "tropes_themes", rx: /\bsacrifice\b|\bgiving\s+one'?s\s+life\b/i },
    { slug: "wartime-romance", group: "tropes_themes", rx: /\bwartime\s+romance\b|\blove\s+in\s+wartime\b/i },
    { slug: "ambush", group: "tropes_themes", rx: /\bambush\b|\bsurprise\s+attack\b/i },
    { slug: "espionage", group: "tropes_themes", rx: /\bespionage\b|\bspycraft\b/i },
    
    // War settings & tone
    { slug: "tense", group: "tone_mood", rx: /\btense\b|\bnerve[-\s]?wracking\b/i },
    { slug: "tragic", group: "tone_mood", rx: /\btragic\b|\bsomber\b|\bheartbreaking\b/i },
    { slug: "patriotic", group: "tone_mood", rx: /\bpatriotic\b|\bnationalistic\b/i },
    { slug: "battlefield", group: "setting", rx: /\bbattlefield\b|\bfrontline\b|\bcombat\s+zone\b/i },
    { slug: "trench", group: "setting", rx: /\btrench\b|\btrench\s+warfare\b/i },
    { slug: "barracks", group: "setting", rx: /\bbarracks\b|\bencampment\b|\bmilitary\s+camp\b/i },
    { slug: "warship", group: "setting", rx: /\bwarship\b|\bnaval\s+ship\b|\bbattleship\b/i },
    
    // === New Adult tropes ===
    { slug: "college-life", group: "tropes_themes", rx: /\bcollege\s+life\b|\bdorm\s+drama\b/i },
    { slug: "first-job", group: "tropes_themes", rx: /\bfirst\s+job\b|\bentry\s+level\b/i },
    { slug: "self-discovery", group: "tropes_themes", rx: /\bself\s+discovery\b|\bfinding\s+oneself\b/i },
    { slug: "independence", group: "tropes_themes", rx: /\bindependence\b|\bmoving\s+out\b/i },
    { slug: "sexual-exploration", group: "tropes_themes", rx: /\bsexual\s+exploration\b|\bexploring\s+sexuality\b/i },
    { slug: "friendship", group: "tropes_themes", rx: /\bfriendship\b|\broommate\s+bond\b/i },
    
    // New Adult settings & tone
    { slug: "angsty", group: "tone_mood", rx: /\bangst(y)?\b|\bturbulent\b/i },
    { slug: "romantic", group: "tone_mood", rx: /\bromantic\b|\bheartfelt\b/i },
    { slug: "steamy", group: "tone_mood", rx: /\bsteamy\b|\bsizzling\b/i },
    { slug: "college-campus", group: "setting", rx: /\bcollege\s+campus\b|\bdormitory\b/i },
    { slug: "first-apartment", group: "setting", rx: /\bfirst\s+apartment\b|\bstudio\s+apartment\b/i },
    { slug: "bars-clubs", group: "setting", rx: /\bbars?\b|\bnightclub\b|\bpub\b/i },
    { slug: "road-trip", group: "setting", rx: /\broad\s+trip\b|\bbackpacking\b|\bjourney\b/i },
    
    // === Sports Fiction tropes ===
    { slug: "underdog", group: "tropes_themes", rx: /\bunderdog\b|\bcome\s+from\s+behind\b/i },
    { slug: "rivalry", group: "tropes_themes", rx: /\brivalry\b|\barch\s+nemesis\b/i },
    { slug: "championship", group: "tropes_themes", rx: /\bchampionship\b|\btournament\b|\bfinals\b/i },
    { slug: "injury", group: "tropes_themes", rx: /\binjury\b|\bcareer[-\s]?ending\b|\brecovery\b/i },
    { slug: "comeback", group: "tropes_themes", rx: /\bcomeback\b|\breturn\s+to\s+the\s+field\b/i },
    { slug: "team-dynamics", group: "tropes_themes", rx: /\bteam\s+dynamics\b|\bteam\s+bonding\b/i },
    
    // Sports settings & tone
    { slug: "inspiring", group: "tone_mood", rx: /\binspiring\b|\binspirational\b/i },
    { slug: "competitive", group: "tone_mood", rx: /\bcompetitive\b|\bhigh[-\s]?stakes\b/i },
    { slug: "triumphant", group: "tone_mood", rx: /\btriumphant\b|\bvictorious\b/i },
    { slug: "stadium", group: "setting", rx: /\bstadium\b|\barena\b|\bballpark\b/i },
    { slug: "field", group: "setting", rx: /\bfield\b|\bdiamond\b|\bpitch\b/i },
    { slug: "gym", group: "setting", rx: /\bgym\b|\bfitness\s+center\b|\btraining\s+hall\b/i },
    { slug: "locker-room", group: "setting", rx: /\blocker\s+room\b|\bdressing\s+room\b/i },
    
    // === Nautical tropes ===
    { slug: "mutiny", group: "tropes_themes", rx: /\bmutiny\b|\bcrew\s+rebellion\b/i },
    { slug: "treasure-hunt", group: "tropes_themes", rx: /\btreasure\s+hunt\b|\bhidden\s+gold\b/i },
    { slug: "storm-at-sea", group: "tropes_themes", rx: /\bstorm\s+at\s+sea\b|\btempest\b|\bhurricane\b/i },
    { slug: "shipwreck", group: "tropes_themes", rx: /\bshipwreck\b|\bmarooned\b|\bsunken\b\s+ship\b/i },
    { slug: "piracy", group: "tropes_themes", rx: /\bpiracy\b|\bpirates\b/i },
    
    // Nautical settings & tone
    { slug: "adventurous", group: "tone_mood", rx: /\badventurous\b|\bswashbuckling\b/i },
    { slug: "perilous", group: "tone_mood", rx: /\bperilous\b|\bdangerous\b|\btreacherous\b/i },
    { slug: "ship-deck", group: "setting", rx: /\bship\s+deck\b|\bquarterdeck\b|\bmast\b/i },
    { slug: "open-ocean", group: "setting", rx: /\bopen\s+ocean\b|\bhigh\s+seas\b|\bdeep\s+sea\b/i },
    { slug: "tropical-island", group: "setting", rx: /\btropical\s+island\b|\bdesert\s+island\b/i },
    { slug: "harbor", group: "setting", rx: /\bharbor\b|\bport\b|\bdocks\b/i },
    
    // === Family Saga & Realistic Fiction tropes ===
    { slug: "generational-conflict", group: "tropes_themes", rx: /\bgenerational\s+conflict\b|\bparents\s+vs\s+children\b/i },
    { slug: "marriage-crisis", group: "tropes_themes", rx: /\bmarriage\s+crisis\b|\bdivorce\b|\binfidelity\b/i },
    { slug: "mental-illness", group: "tropes_themes", rx: /\bmental\s+illness\b|\bdepression\b|\banxiety\b/i },
    { slug: "addiction", group: "tropes_themes", rx: /\baddiction\b|\balcoholism\b|\bsubstance\s+abuse\b/i },
    { slug: "social-issues", group: "tropes_themes", rx: /\bsocial\s+issues\b|\bracism\b|\bpoverty\b|\bimmigration\b/i },
    { slug: "resilience", group: "tropes_themes", rx: /\bresilience\b|\bovercoming\s+adversity\b/i },
    { slug: "immigrant-story", group: "tropes_themes", rx: /\bimmigrant\s+story\b|\bmigration\b|\bcultural\s+clash\b/i },
    { slug: "secret-past", group: "tropes_themes", rx: /\bsecret\s+past\b|\bfamily\s+secret\b/i },
    
    // Realistic Fiction tone
    { slug: "poignant", group: "tone_mood", rx: /\bpoignant\b|\bheart\s+wrenching\b/i },
    { slug: "introspective", group: "tone_mood", rx: /\bintrospective\b|\bthoughtful\b|\bcontemplative\b/i },
    { slug: "dramatic", group: "tone_mood", rx: /\bdramatic\b|\bsoapy\b|\bemotional\b/i },
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
