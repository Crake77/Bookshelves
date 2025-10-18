# Bookshelves Taxonomy v2 — Tech Plan (Stack-Aware, Low-Cost)

Status: draft
Owner: you + Codex
Last updated: YYYY-MM-DD

## Overview & Goals

Introduce a taxonomy system to power better search and carousel browsing using three pillars:
- Genres (top level)
- Subgenres (child of a genre)
- Cross Tags (tone, setting, tropes, format, content flags)

UI goals:
- Settings: manage which categories (genre or subgenre) show as carousels and in what order.
- Browse: render carousels in saved order; filterable by taxonomy when provided.
- Book Detail Modal: beneath Summary, show three clickable groups: Genres (1–2), Subgenres (1–3), Cross Tags (10–20 with “Show All N”).

Constraints:
- Keep Neon and Vercel usage compatible with free tiers.
- Avoid LLMs in the recommendation/tagging loop; allow optional on-device embeddings later.
- Preserve current behavior as a fallback (no empty states).

## Stack Summary (as detected in repo)

- Client: React + Vite (`client/`), Tailwind + shadcn patterns; routing is local (no Next.js router).
- Dev server: Express (`server/`) serves API + Vite dev middleware.
- Production: Vercel serverless functions under `api/` used by client for browse/search/ingest.
- Data layer: Neon Postgres via Drizzle (`shared/schema.ts`, `db/index.ts`). `books.categories` is a `text[]` currently used for browse filtering.
- Settings: Category and shelf preferences are stored in `localStorage` (`client/src/lib/preferences.ts`).
- Browse logic: `api/browse.ts` fetches lists by algo (popular, rating, recent, for-you), with optional genre filters based on string categories.
- Book modal: `client/src/components/BookDetailDialog.tsx` (no taxonomy yet).

## Approach Summary

1) Add taxonomy tables and link tables in Drizzle; keep `books.categories` as compatibility fallback.
2) Seed taxonomy idempotently (upsert by slug). Maintain a mapping from source categories (Google/BISAC/Thema) to subgenres.
3) On ingest or first interaction, derive primary subgenre + cross tags using rules/keywords; no LLMs required.
4) Update browse queries to prefer taxonomy joins when a taxonomy slug is provided; retain current text[] fallback.
5) Extend UI:
   - Settings: allow adding either Genres or Subgenres to Browse categories (typeahead optional initially).
   - Book modal: render Genres/Subgenres/Cross Tags chips beneath Summary with “Show All”. Chips navigate to Browse with filters.

## Data Model (Drizzle)

Authoritative tables (slugs are unique, kebab-case):

- genre
  - id (uuid, pk)
  - slug (text, unique)
  - name (text)
  - enabled (boolean, default true)
  - created_at / updated_at (timestamptz)

- subgenre
  - id (uuid, pk)
  - genre_id (uuid fk → genre.id)
  - slug (text, unique)
  - name (text)
  - enabled (boolean, default true)
  - created_at / updated_at (timestamptz)

- crosstag
  - id (uuid, pk)
  - group (enum/text: tone_mood | setting | structure | tropes_themes | format | content_flags)
  - slug (text, unique)
  - name (text)
  - enabled (boolean, default true)
  - created_at / updated_at (timestamptz)

- age_market
  - id (uuid, pk)
  - slug (text, unique)
  - name (text)
  - enabled (boolean, default true)

Link tables:
- book_primary_subgenre (book_id unique → subgenre_id, confidence numeric?)
- book_subgenre_candidate (book_id, subgenre_id, confidence numeric)
- book_cross_tag (book_id, crosstag_id, confidence numeric?)
- book_age_market (book_id, age_market_id)

Indexes:
- Unique on slugs, FKs on link tables, composite indexes on (book_id, subgenre_id) and (book_id, crosstag_id).
- Optional partial index on enabled = TRUE for taxonomy tables.

## Seed Content (idempotent upsert by slug)

Genres (enabled):
- fiction, nonfiction, poetry, drama, comics-graphic, anthologies

Representative Subgenres (enabled; examples):
- fiction: literary-fiction, contemporary-fiction, historical-fiction, romance, mystery, crime-detective, thriller, legal-thriller, spy-espionage, horror, gothic, fantasy-epic-high, fantasy-urban, fantasy-portal, grimdark, magical-realism, supernatural-paranormal, science-fiction-hard, science-fiction-space-opera, cyberpunk, dystopian, post-apocalyptic, time-travel, alternate-history, steampunk, military-fiction, western, family-saga, satire, action-adventure
- nonfiction: biography, autobiography, memoir, history, military-history, true-crime, journalism-current-affairs, politics-public-policy, business-economics, personal-finance, self-help, productivity, psychology, philosophy, religion-spirituality, theology, science, nature-environment, technology, health-fitness, nutrition-diet, medicine, education-teaching, travel, essays, art-architecture, music, film-media-studies, sports, parenting-family, crafts-hobbies-diy, cooking-food-writing
- poetry: lyric, narrative, epic, haiku-tanka, spoken-word, sonnet, free-verse, anthology
- drama: tragedy, comedy, historical-drama, melodrama, absurdist, one-act, screenplay-teleplay
- comics-graphic: superhero, slice-of-life, graphic-memoir, manga-shonen, manga-seinen, manga-shojo, manga-josei, webtoon, bd-european-comics, graphic-novel-fantasy, graphic-novel-sf, graphic-novel-nonfiction
- anthologies: short-story-collection, novella, multi-author-anthology, themed-anthology

CrossTag groups (enabled):
- tone_mood: cozy, dark, hopepunk, grim, uplifting, humorous, whimsical, philosophical, suspenseful, heartwarming, bleak, noir
- setting: small-town, big-city, rural, academy-school, workplace, courtroom, medical-hospital, island, closed-circle, space, off-world, post-collapse, alternate-earth, secondary-world, historical-ancient, historical-medieval, historical-regency, historical-victorian, historical-wwi, historical-wwii, near-future
- structure: epistolary, multiple-pov, nonlinear, serial-episodic, frame-narrative, unreliable-narrator
- tropes_themes: found-family, enemies-to-lovers, friends-to-lovers, second-chance, slow-burn, coming-of-age, heist, quest, locked-room, court-intrigue, political-maneuvering, survival, redemption, faith, ethics-morality, technology-and-society, colonization, first-contact, artificial-intelligence, time-loop, game-like-systems-litrpg, cultivation-progression, system-apocalypse
- format: audiobook-original, illustrated, epic-length-600p, novella-length, serial-web, omnibus
- content_flags: clean, fade-to-black-romance, non-graphic-violence, graphic-violence, strong-language, mature-themes

AgeMarket:
- adult, new-adult-18-25, young-adult-12-18, middle-grade-8-12, children-8-12, early-readers-5-8

All seeds must be idempotent (upsert by slug).

## Mapping & Tagging Strategy (no LLMs)

Stage 1 — Rules & Heuristics (ship first):
- Capture source categories (`books.categories`) and any BISAC/Thema codes when available.
- Maintain mapping tables: `source_category_pattern → subgenre.slug`, `bisac/thema → subgenre.slug`.
- Derive cross tags from small keyword lists on title/description per group (tone/setting/tropes/format). Be conservative to avoid mislabels.
- Set primary_subgenre when a confident rule matches; else leave null.

Stage 2 — Optional Embeddings (no personal OpenAI usage):
- On-device tiny model (transformers.js/ONNX) in the browser, lazy-loaded on user view/interaction.
- Compute embedding locally; send vector to server to store in `book_embeddings` to support similarity or subgenre candidates later.

Stage 3 — Human-in-the-loop (optional admin):
- Admin UI to correct low-confidence labels; corrections backfill seeds/mappings.

## UI Changes

Settings (`client/src/pages/SettingsPage.tsx`)
- Keep current localStorage flow. Add optional typeahead to add a known Genre/Subgenre by name/slug. Free-text custom categories remain supported and simply render a carousel (fallback behavior).

Browse (`client/src/pages/BrowsePage.tsx`, `client/src/lib/api.ts`)
- Read optional filter params (e.g., `genre`, `subgenre`, `tag`).
- Pass taxonomy hints to the API; if hints are unknown/custom, fall back to existing behavior.
- Keep current 4 modes: “Most Popular”, “Highest User Rating”, “Recently Added”, “For You”.

Book Detail Modal (`client/src/components/BookDetailDialog.tsx`)
- Beneath Summary add three blocks:
  - GENRES: 1–2 chips (parent genre + chosen subgenre).
  - SUBGENRES: up to 2 additional subgenres if candidates exist (optional).
  - TAGS: 12–16 chips combined across CrossTag groups; “Show All N” to expand.
- Clicking any chip opens Browse with the relevant filter.
- Hide sections gracefully if no taxonomy is present.

## Browse Algorithms & Filters (SQL, low cost)

General: If taxonomy filter provided, pre-filter using link tables, then apply the mode-specific ranking. If absent, fall back to `books.categories` LIKE/unnest heuristics (current behavior) to avoid empty states.

- popular: recency + rating_count weighting (current shape). Filter by taxonomy first when provided.
- rating: Bayesian/weighted average (prior weight), taxonomy filter first.
- recent: publish date recency, taxonomy filter first.
- for-you: keep current preference scoring derived from user’s prior shelves; prefer taxonomy joins when available, otherwise fall back to text[] categories.

Indexes on link tables ensure taxonomy filters don’t regress latency on free Neon.

## Cost & Free-Tier Considerations

- Avoid batch backfills; compute taxonomy on ingest or lazily on user interaction.
- Keep mappings/keywords small and cached.
- Keep data shape narrow in queries; ensure join predicates are indexed.
- Retain localStorage preferences for categories to reduce write load; per-user DB persistence can come later.

## API Surface (minimal, align to existing style)

Add endpoints only if needed for admin/seed:
- `/api/taxonomy/seed` (POST or protected) — optional idempotent seed trigger.
- `/api/books/{id}/taxonomy` — returns `{ genre, subgenre, tags[], allTagCount }` for the modal. Can be merged into existing book detail payloads later.

Existing `/api/browse` gains taxonomy-aware filtering via query params: `genre`, `subgenre`, `tag`.

## Rollout Plan

Phase 1 (ship):
1. Add taxonomy + link tables in `shared/schema.ts` with indexes.
2. Add idempotent seed routine and mapping tables/files.
3. Attach taxonomy inference on ingest (or first-view lazy flow).
4. Update `/api/browse` to accept taxonomy filters and prefer taxonomy when present; keep current fallback.
5. Render modal chips beneath Summary; chips navigate to Browse with filters.

Phase 2 (nice-to-have):
6. Settings typeahead for adding known Genres/Subgenres to Browse categories.
7. Optional: persist per-user browse categories to Neon instead of localStorage.

Phase 3 (optional):
8. On-device embeddings for candidate subgenres; admin correction UI.

## Open Questions (confirm before coding)

1) Keep category order in localStorage for now, or move to Neon in Phase 1?
2) CrossTag group names acceptable, or rename/refine any?
3) Are you open to on-device embeddings later (no external API use) as a low-cost “AI” addition?

## Next Steps (execution checklist)

- Decide on Q1–Q3 above (owner decision).
- Phase 1 tasks:
  - Schema: add taxonomy + link tables in `shared/schema.ts` with indexes.
  - Seeds: implement idempotent seed (script or endpoint) and small mapping files.
  - Ingest: extend ingest path to apply mapping + heuristics and write links.
  - Browse: extend `api/browse.ts` to recognize `genre|subgenre|tag` and use taxonomy joins, else fallback.
  - Modal: add three chip groups beneath Summary; enable chip → Browse filters.
  - Validation: light manual QA and ensure existing e2e still passes.

## Day-to-Day Tracker (live status)

- Current Focus: Phase 1 — Schema + Seeds

- Next Steps
  - [x] Schema: add taxonomy tables in `shared/schema.ts` (genre, subgenre, crosstag, age_market)
  - [x] Schema: add link tables (book_primary_subgenre, book_subgenre_candidate, book_cross_tag, book_age_market) + indexes
  - [x] Seeds: idempotent upsert-by-slug for Genres/Subgenres/CrossTags/AgeMarkets
  - [ ] Mapping: source category/BISAC/Thema → subgenre.slug
  - [ ] Ingest: apply mapping + heuristics to populate links
  - [ ] API: extend `api/browse.ts` to accept `genre|subgenre|tag` and use taxonomy, else fallback
  - [ ] UI: Book modal chips beneath Summary (Genres/Subgenres/Tags + Show All)
  - [ ] Validation: run Playwright e2e shelf-status on preview

- In Progress
  - Mapping: source category/BISAC/Thema → subgenre.slug — implement mapping files and loader

- Handoff Snapshot
  - Next file: `server/routes.ts` (ingest path) and `api/ingest.ts` — add mapping + heuristics to populate taxonomy links
  - Next action: implement mapping tables (source category/BISAC → subgenre.slug) and basic keyword heuristics for cross tags
  - Resume prompt: “Open docs/tech-plans/taxonomy-ui-plan.md and continue with the Mapping task under Day-to-Day Tracker.”

- Session Log
  - 2025-10-18: Created tech plan; added day-to-day tracker and handoff snapshot.
  - 2025-10-18: Implemented taxonomy + link tables in `shared/schema.ts`; updated tracker to Seeds next.
  - 2025-10-18: Added idempotent taxonomy seed endpoint at `api/taxonomy-seed.ts`.

## How to Resume in a New Codex Session

In your next session, paste one of the following prompts:

- “Load docs/tech-plans/taxonomy-ui-plan.md and pick up from ‘Next Steps’ Phase 1.”
- “Open docs/tech-plans/taxonomy-ui-plan.md and start with the Schema task under Next Steps.”

Codex will reread this document, confirm decisions for the Open Questions, and continue with the listed Next Steps.
