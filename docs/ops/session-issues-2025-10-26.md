# Session Issues – 2025-10-26

Purpose: capture all outstanding blockers before handing the repository back to the Warp agent. Each section explains why the issue matters and how to resolve it.

---

## 1. TypeScript Build Failures (`npm run check`)

**Status:** ✅ Resolved 2025-10-26 (Codex) — HorizontalBookRow/Browse chips now use typed unions, server handlers import the correct modules, and Drizzle queries avoid raw boolean comparisons.

`npm run validate` currently fails during `npm run check` because of the following errors:

| File | Line | Issue | Why it matters / Next step |
|------|------|-------|----------------------------|
| `client/src/components/HorizontalBookRow.tsx` | 99-100 | `secondaryChips` infers to `never` because its union isn’t typed; TypeScript can’t access `.label`/`.type`. | Define a discriminated union type for chips (e.g., `type Chip = string \| { label: string; type: 'tag' \| 'content-flag' \| 'blocked' }`) and annotate `secondaryChips` prop + local `chip` variable. |
| `client/src/pages/BrowsePage.tsx` | 311 | `chips` is typed as `Array<{label: string; type: string}>` but `HorizontalBookRow` expects `string[]`. | Update prop typing on `HorizontalBookRow` to accept chip objects (see issue above) or downgrade `chips` back to strings; both files must agree. |
| `server/api-handlers/ingest.ts`, `monitor.ts`, `notes.ts` | imports | Modules such as `../server/lib/user-books-db.js` and `../lib/prisma` are missing. | These handlers can’t compile, which blocks deployments. Restore the missing modules, fix import paths, or exclude the handlers from the build until ready. |
| `server/lib/editions-api.ts` | 166, 180 | Passing bare booleans into Drizzle `where` clauses (`boolean` ≠ `SQLWrapper`). | Wrap comparisons with SQL helpers (e.g., `eq(column, value)`) so Drizzle types line up. |
| `server/lib/editions-api.ts` | 327 | `db.insert(editionEvents)` receives a plain object; its `eventType` property must be one of the literal union values. | Convert `eventType` to the declared enum (e.g., `'ORIGINAL_RELEASE'`) and ensure the argument shape matches `insert`. |

Until these are fixed, `npm run validate` (and CI) will keep failing and we can’t trust builds.

---

## 2. Validator Failures (Missing Provenance)

**Status:** ✅ Resolved 2025-10-26 (Codex) — `scripts/validate/validator.ts` now passes after back-filling provenance arrays from each book’s evidence snapshots (see git history for JSON updates).

Running just the validator (`node --dns-result-order=ipv4first --import tsx scripts/validate/validator.ts`) reports **136 issues across 10 books**, all due to cross-tags that declare `method = pattern-match+evidence` (or `llm`/`hybrid`) but have empty `provenance_snapshot_ids`.

| Book (ID) | Missing tags | Notes |
|-----------|--------------|-------|
| `(Eco)Anxiety in Nuclear Holocaust Fiction and Climate Fiction` (`00df7f2a-…81ec`) | 15 | Missing provenance for tags like `artificial-intelligence`, `heist`, `underwater-city`. |
| `Summer of Lovecraft: Cosmic Horror in the 1960s` (`02901e6f-…6af0`) | 6 | Mostly `artificial-intelligence`, `augmented-reality`, `heist`, `eerie`. |
| `Blue-Green Rehabilitation` (`02bd1dc8-…97d6`) | 19 | Mix of city-setting tags and thriller motifs losing provenance. |
| `Justice in Young Adult Speculative Fiction` (`03082e3d-…6f1e`) | 14 | Same AI/AR/gritty tags plus `psychic-powers`. |
| `The Complete Nebula Award-winning Fiction` (`033508ff-…dc84`) | 20 | Needs provenance on `novelette`, `space`, `quest`, etc. |
| `The Fantasy and Necessity of Solidarity` (`0482d088-…6e1b`) | 17 | Adds `activism`, `environmental-justice`, `memoir` style tags without snapshots. |
| `The Invisible Life of Addie LaRue` (`04537132-…f04c4`) | 12 | Same pattern-match tags lacking evidence. |
| `When I'm Gone` (`04b43824-…de19a`) | 11 | Romance/ghost tags missing provenance. |
| `Nebula Award Stories Five` (`05eaef7d-…6ed8`) | 20 | Anthology-specific slugs like `novelette` flagged. |
| `Science Fiction` (`068a9286-…1747`) | 2 | `alien-contact`, `augmented-reality` missing provenance. |

**Why this matters:** The production DB now stores `source_ids` for provenance. Any tag without snapshots can’t be audited, and `npm run validate` fails until provenance exists. Fix by re-running `npm run evidence:sync -- <book-id>` to refresh `provenance_snapshot_ids` or downgrade the tag’s `method` to plain `pattern-match` (no evidence claim).

Common offenders (top 10 slugs missing provenance): `augmented-reality`, `artificial-intelligence`, `heist`, `gritty`, `fire-magic`, `nanotechnology`, `riches-to-rags`, `underwater-city`, `progression-fantasy`, `war`.

---

## 3. Cross-Tag Vocabulary Gaps

**Status:** ✅ Resolved 2025-10-26 (Codex) — Added 399 missing slugs to `bookshelves_complete_taxonomy.json` (total cross-tags now 3,132). Each new entry inherits its description from the pattern note so deterministic tagging no longer throws `[cross-tags] Skipping unknown slug …` for evidence-backed matches.

Referenced file: `docs/ops/cross-tag-gap-report.md` (retained for historical context and future taxonomy planning).

---

### Summary of Required Follow-ups

1. ✅ TypeScript build issues cleared (`npm run check` now passes).
2. ✅ Validator passes after provenance backfill; rerun after future harvests to keep data consistent.
3. ✅ Cross-tag taxonomy aligned with the pattern catalog (399 slugs added).

All blocker items are closed; resume harvest/enrichment once Neon connectivity cooperates.
