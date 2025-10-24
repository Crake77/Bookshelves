# Enrichment Workflow Fixes v2.0

## Critical Issues Identified (2025-10-24)

### Issue #1: Task Execution Order is Backwards
**Problem**: Taxonomy classification (domains, genres, subgenres, cross-tags) happens BEFORE rich AI summaries are written, so classification uses sparse Google Books metadata instead of detailed context.

**Current (BROKEN) Order:**
1. Task 1: Cover URLs + OLID
2. Task 2: Authors
3. Task 3: Summary Preparation (flags only)
4. **Task 4: Domain/Supergenres** ❌ Uses sparse original description
5. **Task 5: Genres/Subgenres** ❌ Uses sparse original description  
6. **Task 6: Cross-tags** ❌ Uses sparse original description
7. Task 7: Format/Audience
8. Task 8: Generate SQL
9. THEN: Generate worksheet → Write summaries → Import summaries → Regenerate SQL

**Result**: Books like "When I'm Gone" get classified with minimal metadata, missing subgenres, cross-tags, etc.

---

### Issue #2: Single-Source Metadata (Google Books Only)
**Problem**: We only use Google Books API data which often has:
- Sparse/minimal descriptions
- Limited or incorrect categories
- Missing genre signals

**Missing Sources:**
- ❌ Open Library subjects (often very detailed)
- ❌ Open Library work-level descriptions (usually better than edition descriptions)
- ❌ Comparison/merging of multiple sources

---

## Solution: Reordered Workflow

### NEW CORRECT WORKFLOW:

**Phase 1: Data Gathering**
1. Task 1: Cover URLs + OLID ✅
2. **Task 2: Fetch Comprehensive Metadata** (NEW)
   - Google Books (existing data)
   - Open Library edition data (subjects, description)
   - Open Library work-level data (subjects, description)
   - Merge and compare all sources
   - Choose best description
   - Combine all genre/subject hints
3. Task 3: Authors ✅

**Phase 2: Summary Writing (CRITICAL - Must happen BEFORE classification)**
4. Task 4: Generate Summary Worksheet
   - Uses best available description from multiple sources
5. **MANUAL: Write Rich AI Summaries** (150-300 words)
   - Include genre cues, themes, setting details
   - Add character types, tropes, tone indicators
6. Task 5: Import Summaries

**Phase 3: Taxonomy Classification (NOW has rich summaries + multi-source data)**
7. Task 6: Domain + Supergenres
   - Uses AI summary + Open Library subjects + Google categories
8. Task 7: Genres + Subgenres
   - Uses AI summary + Open Library subjects + Google categories
9. Task 8: Cross-Tags (10-20 required)
   - Uses AI summary + Open Library subjects
   - Should easily hit 10-20 with rich summary

**Phase 4: Finalization**
10. Task 9: Format + Audience
11. Task 10: Quality Validation
12. Task 11: Generate SQL
13. Task 12: Execute SQL → Database

---

## Implementation Changes Needed

### 1. Rename existing tasks:
- `task-02-authors.js` → `task-03-authors.js`
- `task-03-summary.js` → `task-04-generate-summary-worksheet.js`
- `import-summaries.js` → `task-05-import-summaries.js`
- `task-04-domain-supergenres.js` → `task-06-domain-supergenres.js`
- `task-05-genres-subgenres.js` → `task-07-genres-subgenres.js`
- `task-06-cross-tags.js` → `task-08-cross-tags.js`
- `task-07-format-audience.js` → `task-09-format-audience.js`
- `task-08-generate-sql.js` → `task-11-generate-sql.js`

### 2. Create new task:
- ✅ `task-02-fetch-metadata.js` (CREATED)
  - Fetches Open Library data
  - Merges with Google Books
  - Extracts genre hints from subjects
  - Chooses best description

### 3. Add new task:
- `task-10-validate-quality.js` (existing validate-quality.js)

### 4. Update all taxonomy tasks to use enriched summaries:
- Modify tasks 6-8 to PREFER `enrichmentData.summary.new_summary` over original description
- Change condition from `if (!description)` to `if (enrichmentData?.summary?.new_summary)`
- Always use the richer AI summary when available

### 5. Update enrich-batch.js orchestrator:
- Reorder task execution
- Add pause after task 4 for manual summary writing
- Or split into two scripts: `enrich-batch-part1.js` and `enrich-batch-part2.js`

---

## Testing Plan

### Test on "When I'm Gone" (book 04b43824):
1. Run new task-02-fetch-metadata.js
   - Verify Open Library subjects fetched
   - Check for better description sources
2. Generate summary worksheet with multi-source context
3. Use existing rich AI summary (already written)
4. Re-run tasks 6-8 (domain, genres, cross-tags)
5. Expected results:
   - ✅ Genre: romance
   - ✅ Subgenres: contemporary-romance, second-chance-romance
   - ✅ Cross-tags: 10-20 including: class-differences, family-drama, second-chances, workplace-romance, single-pov, slow-burn, emotional-healing, ranch-setting, celebrity-family, estranged-family
   - ✅ Format: paperback (from Open Library)

---

## Batch 001 Remediation

Since batch 001 already has rich summaries written, we can:
1. Run new task-02-fetch-metadata.js on all 10 books
2. Re-run tasks 6-8 to reclassify using summaries + Open Library data
3. Regenerate SQL
4. Re-execute against database

This will test the full corrected pipeline on real data.

---

## Updated BATCH_ENRICHMENT_MASTER.md

The master playbook needs complete rewrite of Step 2 section to reflect:
- New task numbering
- Task 2: Multi-source metadata fetching
- Tasks 4-5: Summary generation BEFORE classification
- Tasks 6-8: Classification WITH rich summaries
- Task 10: Quality validation
- Task 11: SQL generation

---

## Success Criteria

After implementing these fixes:
- ✅ All books get 1-3 subgenres (not 0)
- ✅ All books get 10-20 cross-tags (not 0-3)
- ✅ Classification uses Open Library subjects + AI summaries
- ✅ Format detection improved with Open Library data
- ✅ More accurate domain/genre/supergenre assignments
- ✅ Pipeline is reproducible and documented
