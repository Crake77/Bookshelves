# Book Metadata Enrichment - Master Playbook

**Single-command batch processing for AI agents**

---

## Quick Start (For New Conversations)

**To process the next batch of books, use this exact phrase:**

> "Process the next batch of 10 books for metadata enrichment following BATCH_ENRICHMENT_MASTER.md"

The AI agent will:
1. Read all necessary context and documentation
2. Export next 10 books from database
3. Run complete enrichment workflow
4. Write enriched data back to Neon database
5. Commit all work to Git

---

## Prerequisites (Read First)

### Required Context Files
The AI agent MUST read these files first:
1. **WARP.md** — General Warp agent guidelines
2. **AGENTS.md** — Project-specific environment and workflow
3. **WARP-WORKFLOW.md** — Development workflow standards
4. **GPT_METADATA_ENRICHMENT_GUIDE.md** — Enrichment quality standards
5. **bookshelves_complete_taxonomy.json** — Official taxonomy reference

### Environment Setup (Already Configured)
- ✅ Windows 10/11 with PowerShell 5.1
- ✅ Node.js v25.0.0 with ES modules
- ✅ PostgreSQL connection via `pg` library (psql NOT installed)
- ✅ DATABASE_URL in `.env.local`
- ✅ Git configured and authenticated
- ✅ All npm dependencies installed

---

## Complete Workflow (10 Steps)

### Step 1: Export Books from Database

**Script:** `export-books.js`

```javascript
// Exports next 10 unenriched books to books_batch_NNN.json
// Increments batch number automatically
// Checks for existing batches to avoid duplicates
```

**Command:**
```powershell
node export-books.js
```

**Output:** `books_batch_NNN.json` (where NNN is next batch number)

---

### Step 2: Run Enrichment Tasks (1-8)

**Script:** `enrich-batch.js`

This orchestration script runs 8 micro-tasks sequentially on all books:

**Task 1: Cover URLs** (`task-01-cover-urls.js`)
- Fetches cover images from Google Books API
- Falls back to OpenLibrary if Google fails
- Saves recommended URL

**Task 2: Authors** (`task-02-authors.js`)
- Validates author names
- Formats as array for PostgreSQL TEXT[]
- Flags issues for manual review

**Task 3: Summary Preparation** (`task-03-summary.js`)
- Identifies which books need summary rewrites
- Flags books with no description (write from scratch)
- Creates tracking for manual writing step

**Task 4: Domain + Supergenres** (`task-04-domain-supergenres.js`)
- Classifies as fiction/non-fiction
- Assigns 1-2 supergenres from official taxonomy
- Uses category keywords for matching

**Task 5: Genres + Subgenres** (`task-05-genres-subgenres.js`)
- Assigns primary genres
- Assigns 1-5 subgenres per genre
- All slugs validated against taxonomy

**Task 6: Cross-Tags** (`task-06-cross-tags.js`)
- Applies 10-20 cross-tags per book
- Includes content warnings, tropes, themes, settings
- All slugs validated against taxonomy

**Task 7: Format + Audience** (`task-07-format-audience.js`)
- Detects audience (adult, YA, middle-grade, children)
- Attempts format detection (usually unknown due to limited metadata)

**Task 8: Generate SQL** (`task-08-generate-sql.js`)
- Creates idempotent SQL migration script per book
- Uses PostgreSQL ARRAY[] syntax for authors (NOT JSON)
- Includes DELETE statements for idempotency
- All INSERT statements use taxonomy slug lookups

**Command:**
```powershell
node enrich-batch.js
```

**Output:**
- `enrichment_data/<book_id>.json` (10 files)
- Summaries marked for manual writing

---

### Step 3: Generate Summary Worksheet

**Script:** `generate-summary-worksheet.js`

Creates a markdown file with all books needing summaries, including:
- Original description (for reference)
- Empty section for new 150-300 word summary
- Book metadata (ID, author, ISBN)

**Command:**
```powershell
node generate-summary-worksheet.js
```

**Output:** `SUMMARY_REWRITE_WORKSHEET.md`

---

### Step 4: Write Original Summaries (MANUAL)

**AI Agent Action:** Read `SUMMARY_REWRITE_WORKSHEET.md` and write original 150-300 word summaries for each book.

**Requirements (from GPT_METADATA_ENRICHMENT_GUIDE.md):**
- 150-300 words (strict)
- No spoilers beyond first act
- No marketing language ("riveting", "stunning", etc.)
- No copied phrases longer than 3-4 words from original
- Focus on: premise, themes, setting, tone
- Write in neutral, informative voice

**Process:**
1. Read book metadata and original description
2. Write completely original summary
3. Insert summary into worksheet under "NEW SUMMARY" section
4. Verify word count (150-300)

---

### Step 5: Import Summaries

**Script:** `import-summaries.js`

Parses `SUMMARY_REWRITE_WORKSHEET.md` and:
- Extracts book IDs and new summaries via regex
- Validates word count (warns if outside 150-300)
- Updates enrichment JSON files
- Automatically regenerates SQL with new descriptions

**Command:**
```powershell
node import-summaries.js
```

**Output:** Updated enrichment JSON + regenerated SQL files

---

### Step 6: Manual Taxonomy Review (if needed)

**Check:** Review `enrichment_data/*.json` for any warnings:
- `"status": "needs_manual_review"` in taxonomy section
- Missing supergenres
- Questionable genre assignments

**If issues found:**
1. Manually edit the JSON file with correct taxonomy slugs
2. Re-run task 8 for that specific book:
   ```powershell
   node enrichment-tasks/task-08-generate-sql.js "<book_id>"
   ```

---

### Step 7: Execute SQL Against Neon Database

**Script:** `execute-batch-sql.js`

**CRITICAL FIXES APPLIED:**
- ✅ Uses Node.js `pg` library (psql NOT available on Windows)
- ✅ Authors field uses PostgreSQL `ARRAY['Author Name']` syntax, NOT JSON
- ✅ Wraps all statements in BEGIN/COMMIT transaction
- ✅ Automatic rollback on any error
- ✅ Reads DATABASE_URL from `.env.local`

**Command:**
```powershell
node execute-batch-sql.js
```

**Output:**
```
🔌 Connecting to Neon database...
✅ Connected

🚀 Starting transaction for 10 books...

📖 [1/10] Executing: <book_id>.sql
   ✅ Success
...
✅ Transaction committed successfully!
📊 Summary: 10 books updated
```

**Validation Query (optional):**
```javascript
node -e "import pg from 'pg'; const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}}); await c.connect(); const r = await c.query(\"SELECT id, title, authors[1] as author, LEFT(description, 50) FROM books WHERE id IN ('book_id_1', 'book_id_2')\"); console.log(r.rows); await c.end();"
```

---

### Step 8: Create Batch Report

**Script:** Create `batch_reports/batch_NNN_final_report.md`

Include:
- List of all 10 books with IDs
- Summary statistics (word counts, taxonomy coverage)
- Any manual interventions required
- Quality metrics
- Issues encountered and resolved

**Template:** Use `batch_reports/batch_001_final_report.md` as reference

---

### Step 9: Update Master Documentation

**File:** `BATCH_001_COMPLETE.md` (or create `BATCH_NNN_COMPLETE.md`)

Document:
- Complete file structure
- All generated outputs
- Workflow summary
- Lessons learned
- Any new issues discovered

---

### Step 10: Commit to Git

**Commands:**
```powershell
git add -A
git commit -m "BATCH NNN COMPLETE: 10 books enriched and imported to database

✅ Enrichment completed for batch NNN
- 10 original summaries written (150-300 words)
- Full taxonomy applied (domains, genres, subgenres, cross-tags)
- SQL executed successfully against Neon DB

📊 Statistics:
- Average summary length: XXX words
- Taxonomy coverage: 100%
- Database import: Success with 0 errors

📁 Files: enrichment_data/, enrichment_sql/, batch_reports/"
```

---

## Key Technical Details (CRITICAL)

### PostgreSQL Authors Field
**WRONG:**
```sql
UPDATE books SET authors = '[\"Author Name\"]' WHERE id = '...';
```

**CORRECT:**
```sql
UPDATE books SET authors = ARRAY['Author Name'] WHERE id = '...';
```

The `authors` column is `TEXT[]` (PostgreSQL array), NOT `JSON` or `JSONB`.

### Database Connection
```javascript
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL, // from .env.local
  ssl: { rejectUnauthorized: false }
});

await client.connect();
await client.query('BEGIN');
// ... execute statements
await client.query('COMMIT');
await client.end();
```

### SQL Idempotency
Every SQL file includes:
```sql
-- Clean up existing taxonomy links (makes script idempotent)
DELETE FROM book_domains WHERE book_id = '...';
DELETE FROM book_supergenres WHERE book_id = '...';
DELETE FROM book_genres WHERE book_id = '...';
DELETE FROM book_subgenres WHERE book_id = '...';
DELETE FROM book_cross_tags WHERE book_id = '...';
DELETE FROM book_age_markets WHERE book_id = '...';
DELETE FROM book_formats WHERE book_id = '...';
```

This allows re-running SQL without errors or duplicates.

---

## File Structure Reference

```
C:\Users\johnd\projects\Bookshelves\
├── BATCH_ENRICHMENT_MASTER.md          ← YOU ARE HERE
├── AGENTS.md                            ← Environment & DB instructions
├── GPT_METADATA_ENRICHMENT_GUIDE.md    ← Quality standards
├── bookshelves_complete_taxonomy.json  ← Official taxonomy
│
├── books_batch_NNN.json                ← INPUT: 10 book records
│
├── enrichment-tasks/                   ← Micro-tasks (1-8)
│   ├── task-01-cover-urls.js
│   ├── task-02-authors.js
│   ├── task-03-summary.js
│   ├── task-04-domain-supergenres.js
│   ├── task-05-genres-subgenres.js
│   ├── task-06-cross-tags.js
│   ├── task-07-format-audience.js
│   └── task-08-generate-sql.js
│
├── enrich-batch.js                     ← Orchestration script
├── generate-summary-worksheet.js       ← Creates worksheet
├── import-summaries.js                 ← Imports summaries back
├── execute-batch-sql.js                ← Executes SQL via pg library
│
├── enrichment_data/                    ← OUTPUT: Enrichment JSON
│   └── <book_id>.json (x10)
│
├── enrichment_sql/                     ← OUTPUT: SQL scripts
│   ├── <book_id>.sql (x10)
│   └── BATCH_NNN_MASTER.sql           ← (optional master script)
│
├── batch_reports/                      ← OUTPUT: Reports
│   └── batch_NNN_final_report.md
│
├── SUMMARY_REWRITE_WORKSHEET.md        ← TEMP: For manual summary writing
└── BATCH_NNN_COMPLETE.md               ← OUTPUT: Complete documentation
```

---

## Troubleshooting

### Issue: "psql not recognized"
**Solution:** Use `execute-batch-sql.js` with Node.js `pg` library. Never use `psql` command.

### Issue: "malformed array literal" on authors field
**Solution:** SQL generation now uses `ARRAY['Author']` syntax. If old SQL exists, regenerate with:
```powershell
node enrich-batch.js
```

### Issue: Summary word count outside 150-300 range
**Solution:** Edit `SUMMARY_REWRITE_WORKSHEET.md` and re-run:
```powershell
node import-summaries.js
```

### Issue: Missing supergenres or taxonomy gaps
**Solution:** 
1. Check `enrichment_data/<book_id>.json` for `"status": "needs_manual_review"`
2. Manually add correct slugs from `bookshelves_complete_taxonomy.json`
3. Regenerate SQL: `node enrichment-tasks/task-08-generate-sql.js "<book_id>"`

### Issue: Cross-tags seem irrelevant (false positives)
**Note:** This is a known limitation of keyword matching. Review first 3-5 books of each batch and manually remove irrelevant tags if needed.

### Issue: Format always "unknown"
**Note:** This is expected. Metadata from Google Books rarely includes format info. Leave as unknown or manually add if known.

---

## Quality Checklist (Before Database Import)

- [ ] All 10 summaries written (150-300 words each)
- [ ] No summaries contain marketing language
- [ ] No summaries have spoilers beyond first act
- [ ] All summaries use original wording (no copied phrases >3-4 words)
- [ ] All enrichment JSON files have `"status": "completed"` (or acceptable warnings)
- [ ] Spot-check 2-3 books' taxonomy assignments for accuracy
- [ ] All SQL files generated without errors
- [ ] SQL uses `ARRAY[]` syntax for authors
- [ ] Batch report created with statistics

---

## Success Metrics

**After completing a batch, verify:**

✅ **Database Import:**
- Transaction committed successfully (no rollbacks)
- Query shows updated `authors`, `description`, `cover_url`
- Taxonomy tables populated (domains, genres, subgenres, cross-tags)

✅ **Quality:**
- Average summary word count: 150-300 (target: ~240)
- Taxonomy coverage: 100% (domain, supergenres, genres)
- Cross-tag count: 10-20 per book

✅ **Documentation:**
- Batch report created with statistics
- All work committed to Git
- BATCH_NNN_COMPLETE.md created

---

## Single-Phrase Command (For AI Agent)

To start a new batch in a fresh conversation, use:

> **"Process the next batch of 10 books for metadata enrichment following BATCH_ENRICHMENT_MASTER.md"**

The AI agent will:
1. ✅ Read all context files (AGENTS.md, WARP.md, etc.)
2. ✅ Export next 10 books from database
3. ✅ Run enrichment tasks 1-8
4. ✅ Generate summary worksheet
5. ✅ Write original summaries (150-300 words each)
6. ✅ Import summaries and regenerate SQL
7. ✅ Review and fix any taxonomy gaps
8. ✅ Execute SQL against Neon database
9. ✅ Create batch report
10. ✅ Commit all work to Git

---

## Batch History

| Batch | Books | Status | Date | Notes |
|-------|-------|--------|------|-------|
| 001   | 10    | ✅ Complete | 2025-10-23 | Initial batch, fixed PostgreSQL array syntax |
| 002   | 10    | 🔄 Pending | — | — |

---

## Version History

**v1.0** (2025-10-23)
- Initial master playbook created
- Batch 001 completed successfully
- PostgreSQL array syntax fix documented
- Node.js database execution workflow established

---

**End of Master Playbook**

*For questions or issues, refer to:*
- *AGENTS.md* — Environment and database instructions
- *GPT_METADATA_ENRICHMENT_GUIDE.md* — Quality standards
- *enrichment-tasks/README.md* — Technical task documentation
- *BATCH_001_COMPLETE.md* — Reference implementation
