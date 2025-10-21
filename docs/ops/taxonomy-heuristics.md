# Taxonomy Heuristics — Current Behavior and Tuning Guide

Scope
- Describes the current non‑ML tagging and how to tune it safely.
- Applies to Tags/Genres chips shown in the Book Detail dialog.

Where the logic lives
- Heuristic mapping: `shared/taxonomy.ts`
  - `SUBGENRE_PATTERNS`: regex patterns that infer a primary subgenre from title/description/categories.
  - `TAG_KEYWORDS`: list of `{ slug, group, rx }` keyword regexes used to set cross tags.
- Applied at ingest: `api/ingest.ts`
  - After upserting a book, we best‑effort attach `book_primary_subgenres` and `book_cross_tags` (idempotent, guarded).
- Chips render: `client/src/components/BookTaxonomyChips.tsx`
  - Lazy‑loaded inside the dialog so the dialog core (status, rating) remains stable even if chips fail.

Current trade‑offs
- Conservative but imperfect regexes yield occasional false positives (e.g., too many `artificial-intelligence`).
- Tags appear after first open because ingest attaches taxonomy then chips refetch.
- No background batch jobs to keep Neon costs down; inference is per‑interaction.

How to reduce false positives
- Tighten `TAG_KEYWORDS` in `shared/taxonomy.ts`:
  - Use more specific expressions (e.g., `\bA\.I\.|\bartificial intelligence\b` only when “robot|android|machine learning|sentient” also present nearby).
  - Add negative lookaheads/exclusions where needed.
  - Keep list small; measure by spot‑checking top titles.
- Prefer subjects when present:
  - Add/expand a mapping from source categories (Google categories, BISAC/Thema) → subgenre before using free‑text heuristics.
- Make tags opt‑in by signal strength:
  - Only attach a tag if ≥N distinct keyword hits or subject + keyword confirm.

Operational controls
- Rerun taxonomy seed (safe, idempotent):
  - `curl -X POST https://<preview-or-prod>/api/taxonomy-seed`
- Remove a noisy tag globally: temporarily disable the `TAG_KEYWORDS` match and redeploy.
- Per‑book cleanup (future): add an admin endpoint/UI for manual corrections.

Known issue / TODO
- Cover/title mismatches occur in browse top‑ups: add a normalization pipeline so cover image matches title/author (see docs/ops/browse-infinite-scroll.md TODO section).

Don’t break
- Keep taxonomy chips lazy: it isolates any future runtime issues from the dialog core.
- Do not run background ML or large batches on Neon free tier.
- Maintain idempotency in ingest and seed steps.

