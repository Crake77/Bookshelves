# Cross-Tag Gap Report – 2025-10-26

**Purpose:** Snapshot of pattern slugs referenced by `cross_tag_patterns_v1.json` that are missing from `bookshelves_complete_taxonomy.json`. These gaps produce `[cross-tags] Skipping unknown slug …` warnings during `enrichment:cross-tags` runs and prevent deterministic tagging from reaching the 10–20 tag target.

---

## High-Level Findings

- **399** pattern slugs are absent from the active taxonomy (out of 640 total patterns).
- Missing slugs skew toward **settings/locales (~53)**, **character archetypes (~49)**, and **relationship/romance markers (~15)**.  
- Many of these concepts already exist under slightly different slugs (e.g., `age-gap-romance` exists but `age-gap` is referenced by patterns), so we can often map rather than add new taxonomy rows.

### Quick Category Breakdown

| Category | Heuristic Keywords | Missing Slugs (approx.) | Notes |
|----------|-------------------|-------------------------|-------|
| Settings & Locales | `*-setting`, `city`, `realm`, `academy`, `ocean`, `island`, etc. | 50+ | Signals for location-heavy queries like “academy mysteries” or “arctic survival”. |
| Character / Factions | `assassin`, `pirate`, `witch`, `android`, etc. | 49 | Useful for persona-centric filters (“assassin POV”). |
| Themes & Motifs | `revenge`, `dysfunctional-family`, `redemption`, etc. | 35 | Many map to existing `theme` or `trope` entries but use different slugs. |
| Relationships | `forbidden-romance-gothic`, `class-difference-romance`, etc. | 15 | Romance sub-slugs that are popular in reader queries. |
| Content Warnings | `accidental-pregnancy`, `sexual-content`, `violence`, etc. | 6 | Should align with existing CW tags to keep policy coverage high. |
| Other / uncategorized | — | 240+ | Includes niche tags (e.g., `atompunk`, `library-heist`, `afterlife-travel`). |

---

## Priority Mapping Recommendations

| Missing Pattern Slug | Suggested Action | Rationale |
|----------------------|------------------|-----------|
| `academy-setting` | Map to existing `academy-school` tag. | Taxonomy already has `academy-school`; align slug names so deterministic patterns resolve. |
| `age-gap` | Map to `age-gap-romance`. | Prevents the LLM helper from needing to translate the colloquial slug. |
| `angel-demon-romance` | Add alias (or new tag) that pairs `angel-romance` + `demon-romance`. | Popular trope; currently no single slug captures the hybrid relationship. |
| `assassin` | Add alias pointing to `assassin-guild` OR add dedicated character tag. | Many books reference “assassin protagonist” without a guild. |
| `bookstore-mystery` | Map to `cozy-mystery` + `bookish-setting` (if added) or create new slug. | A frequent cozy mystery micro-genre flagged by enrichment logs. |
| `climate-change` | Add alias to `climate-fiction` / `eco-thriller`. | Environmental nonfiction/fiction both reference this slug directly. |
| `dysfunctional-family` | Map to `family-drama` if acceptable, otherwise add as separate `theme`. | Appears repeatedly in enrichment data when summarizing literary fiction. |
| `forbidden-romance-gothic` | Split into `forbidden-romance` + `gothic-fiction` or create composite slug. | Prevents the tagger from logging warnings for historical gothics. |
| `grumpy-sunshine` | Ensure taxonomy slug exists (currently missing). | One of the top romance requests; currently dropped entirely. |
| `library-heist` | Map to `heist` + (new) `library-setting`. | Evidence packs mention “library caper”; without slug we lose the nuance. |
| `mage-war` | Map to `mage-conflict` (if added) or `war-magic`. | High-frequency fantasy trope flagged by deterministic patterns. |
| `neurodivergent` | Add/alias to `autistic-representation` / `adhd-representation`. | Current taxonomy lacks umbrella slug for neurodivergent leads; enrichment frequently surfaces it. |
| `pirate-queen` | Map to `pirate-romance` + `queen-protagonist` (if available) or add new slug. | Feminist fantasy/romance queries look for this exact phrasing. |
| `portal-romance` | Add alias referencing `portal-fantasy` + `romance-forward`. | Keeps portal romances (e.g., romantasy) discoverable without manual tagging. |
| `revenge-quest` | Map to existing `revenge` theme (verify slug) or add new trope entry. | Deterministic tagger hits this often; user filters expect “revenge quest” language. |

**Next steps:**  
1. Decide whether each missing slug should be mapped to an existing taxonomy entry or added outright (priority: romance + setting slugs).  
2. Update `bookshelves_complete_taxonomy.json` (and source DB) with the resolved slugs.  
3. Rerun `npm run enrichment:cross-tags` for affected books so the deterministic pipeline stops logging “Skipping unknown slug …” and downstream provenance checks remain clean.
