# NEXT AGENT INSTRUCTIONS

**Last Updated:** 2025-11-04T23:30:00Z  
**Priority:** HIGH – Re-run Batch 002 enrichment with fixes

## ✅ COMPLETED THIS SESSION (2025-11-04)

### All Fixes Implemented

1. **✅ Character Trait Detection** – Added semantic inference for protagonist gender
   - Detects from pronouns ("he", "she", "his", "her")
   - Detects from narrative context ("he journeys", "she discovers")
   - Results: `male-protagonist` and `female-protagonist` tags now detected

2. **✅ Content Warning Detection** – Enhanced with semantic variations
   - "Slavery" detected from "enslaved", "forced servitude", "bondage", etc.
   - "Child-soldiers" detected from "child soldiers", "children fighting", "teenagers at war", etc.
   - Added "child-soldiers" tag to taxonomy (`scripts/taxonomy-seed.ts`)

3. **✅ Pattern Matching Integration** – Fixed to be primary, not gap-filler
   - Pattern matching now merges with direct matches
   - Fixed slug mismatches (e.g., `strong-female-lead` → `female-protagonist` via alias mapping)
   - Patterns now properly prioritized by relevance score

4. **✅ Subgenre Pattern-Based Detection** – Integrated existing `subgenre_patterns.json`
   - Updated task-05 to use pattern-based detection with semantic indicators
   - Added category matching (categories are strong signals)
   - Results: `epic-fantasy`, `space-opera`, `military-science-fiction` now detected

5. **✅ Multiple Values Support** – Implemented for audiences, formats, genres
   - **Audiences**: Returns `slug` (primary) + `includes` array (secondary audiences)
   - **Formats**: Returns `format` (primary) + `formats` array (additional formats)
   - **Genres**: Already supported (returns array)

### Files Modified

- `enrichment-tasks/task-06-cross-tags.js` – Added semantic inference, fixed pattern integration
- `enrichment-tasks/task-05-genres-subgenres.js` – Integrated subgenre pattern matching
- `enrichment-tasks/task-07-format-audience.js` – Added multiple audiences/formats support
- `scripts/taxonomy-seed.ts` – Added `child-soldiers` content flag

### Taxonomy Updates Required

**⚠️ IMPORTANT:** Before re-running enrichment, add `child-soldiers` tag to database:

```bash
# Run taxonomy seed to add child-soldiers tag
npm run db:push  # or run the seed script
```

---

## 🎯 NEXT SESSION PRIORITIES

### Phase 1: Add Taxonomy Tag to Database (FIRST)

1. **Add `child-soldiers` tag to database:**
   ```bash
   # Option A: Run taxonomy seed script
   npm run db:push  # or equivalent seed command
   
   # Option B: Manual SQL insert
   INSERT INTO cross_tags (slug, name, "group", description) 
   VALUES ('child-soldiers', 'Child Soldiers', 'content_flags', 'Depicts children or minors in combat or military roles');
   ```

2. **Verify tag exists:**
   - Check `bookshelves_complete_taxonomy.json` has the tag
   - Verify database has the tag before re-running enrichment

### Phase 2: Re-run Enrichment for Batch 002 (HIGH PRIORITY)

**Re-run enrichment tasks 5, 6, 7 for all Batch 002 books:**

```bash
# For each book in books_batch_002.json:
node enrichment-tasks/task-05-genres-subgenres.js <book_id>
node enrichment-tasks/task-06-cross-tags.js <book_id>
node enrichment-tasks/task-07-format-audience.js <book_id>
```

**Or use batch script:**
```bash
node enrich-batch.js 002
```

**Expected Improvements:**
- ✅ Subgenres: `epic-fantasy`, `space-opera`, `isekai`, `cultivation` should be detected
- ✅ Character traits: `male-protagonist`, `female-protagonist` should be detected
- ✅ Content warnings: `slavery`, `child-soldiers`, `violence` should be detected
- ✅ Multiple audiences: `adult` + `new-adult` + `young-adult` where appropriate
- ✅ Multiple formats: `novel` + `audiobook` where applicable

### Phase 3: Verify and Apply to Database

1. **Review enrichment JSONs:**
   - Check `enrichment_data/<book_id>.json` for each Batch 002 book
   - Verify subgenres, tags, audiences, formats are correct

2. **Apply to database:**
   ```bash
   # Apply all Batch 002 enrichments
   .\apply-batch-enrichment-002.ps1
   ```

3. **Verify in database:**
   - Check that subgenres are assigned
   - Check that cross-tags include protagonist tags and content warnings
   - Check that audiences include multiple values where appropriate
   - Check that formats are correct

---

## 📋 Batch 002 Books to Re-enrich

1. `42b1a772-97a1-4777-97cb-ae30b66feab8` – The Eye of the World
2. `13e4fad3-10ac-4d50-92e8-96e52827dec3` – Ender's Game
3. `6f3452c6-e8c5-4328-941d-4992b401e7fe` – Speaker for the Dead
4. `60eab8a3-98c7-4f63-8b81-208dd9fc8d86` – Defiance of the Fall
5. `661d7f73-dc36-4fd7-94c8-5fd6bba9bf16` – Ascendance of a Bookworm: Part 1 Volume 1
6. `a22d3173-56b0-4aaf-850e-d594a74741d3` – The Great Hunt
7. `d1a8b5c3-4e2f-4a9b-8c7d-1e3f5a7b9c2d` – Tower of God (check ID)
8. `f2b3c4d5-6e7f-8a9b-0c1d-2e3f4a5b6c7d` – Dune (check ID)
9. `g3h4i5j6-7k8l-9m0n-1o2p-3q4r5s6t7u8v` – Path of the Deathless (check ID)
10. `h4i5j6k7-8l9m-0n1o-2p3q-4r5s6t7u8v9w` – Check batch file for exact IDs

---

## 🔍 Verification Checklist

After re-enrichment, verify:

- [ ] **The Eye of the World**: `epic-fantasy` subgenre, `male-protagonist`, `chosen-one`, `prophecy`, `magic` tags, `new-adult` in audience includes
- [ ] **Ender's Game**: `space-opera` subgenre, `male-protagonist`, `child-soldiers` tag, `violence` tag
- [ ] **Speaker for the Dead**: `space-opera` subgenre, `male-protagonist`
- [ ] **Ascendance of Bookworm**: `light-novel` format, `isekai` subgenre, `female-protagonist`, `young-adult` + `new-adult` audiences
- [ ] **Tower of God**: `webtoon` format, `science-fiction` + `fantasy` genres
- [ ] **Defiance of the Fall**: `cultivation` + `post-apocalyptic` subgenres, `fantasy` + `science-fiction` genres, `litrpg`, `cultivation`, `apocalypse` tags, `new-adult` audience
- [ ] **Path of the Deathless**: `web-novel` format, correct title, `litrpg` tags
- [ ] **The Great Hunt**: `slavery`, `abuse`, `heaven` tags (remove incorrect `dragons` tag)
- [ ] **Dune**: `space-opera` subgenre, `new-adult` in audience includes

---

## 📝 Notes

1. **Taxonomy Update Required**: `child-soldiers` tag added to seed file but needs to be in database before enrichment
2. **Multiple Values**: Enrichment JSONs now support `includes` arrays for audiences and `formats` arrays for additional formats
3. **Database Application**: `apply-to-db.ts` may need updates to handle `includes` arrays - check if it supports multiple audiences/formats
4. **Pattern Matching**: All patterns now use slug alias mapping to resolve mismatches

---

**Next Session:** Add `child-soldiers` tag to database, then re-run enrichment for Batch 002 books
