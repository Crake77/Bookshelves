# Metadata Enrichment Micro-Task Workflow

This directory contains a modular, micro-task-based approach to enriching book metadata. Each task is independent, idempotent, and can be run separately or as part of a batch process.

## 📁 Directory Structure

```
enrichment-tasks/          # Task scripts (this directory)
├── task-01-cover-urls.js
├── task-02-authors.js
├── task-03-summary.js
├── task-04-domain-supergenres.js
├── task-05-genres-subgenres.js
├── task-06-cross-tags.js
├── task-07-format-audience.js
├── task-08-generate-sql.js
└── README.md

enrichment_data/           # Accumulated enrichment data (JSON per book)
├── <book-id-1>.json
├── <book-id-2>.json
└── ...

enrichment_sql/            # Generated SQL per book
├── <book-id-1>.sql
├── <book-id-2>.sql
└── ...
```

## 🎯 Task Overview

Each task enriches a specific aspect of book metadata:

| Task | Script | Purpose | Output |
|------|--------|---------|--------|
| **1** | `task-01-cover-urls.js` | Fetch cover image URLs from Google Books + OpenLibrary | Adds `cover_urls` to JSON |
| **2** | `task-02-authors.js` | Validate and clean author data | Adds `authors` to JSON |
| **3** | `task-03-summary.js` | Prepare summary for rewriting (manual AI step) | Adds `summary` to JSON |
| **4** | `task-04-domain-supergenres.js` | Assign domain + supergenres | Adds `taxonomy.domain` and `taxonomy.supergenres` |
| **5** | `task-05-genres-subgenres.js` | Assign genres + subgenres | Adds `taxonomy.genres` and `taxonomy.subgenres` |
| **—** | `scripts/evidence/sync-enrichment.ts` | Copy harvested evidence snapshots into enrichment JSON | Adds `evidence.sources` for provenance |
| **6** | `task-06-cross-tags.js` | Assign 10-20 cross-tags | Adds `taxonomy.cross_tags` (reads `evidence.sources` to cite `snapshot_id` + sets `method`) |
| **6b** | `scripts/enrichment/generate-cross-tags.ts` | LLM fallback when Task 6 can’t reach 10 tags | Calls OpenAI with harvested evidence, adds provenance-backed tags |
| **7** | `task-07-format-audience.js` | Detect format + audience | Adds `format` and `audience` |
| **8** | `task-08-generate-sql.js` | Lint enrichment (10-20 tags, summary/audience/format) and optionally emit SQL (`--write-sql`) | Reports missing fields; optional `.sql` preview |

## 🚀 Running Tasks

### Option 1: Run Individual Tasks

Process a single task for a single book:

```bash
# Example: Process cover URLs for one book
node enrichment-tasks/task-01-cover-urls.js "00df7f2a-9ba5-4835-a09a-2b87c50c81ec"

# Sync harvested evidence into the enrichment JSON (optional but recommended before task 06)
npm run evidence:sync -- "00df7f2a-9ba5-4835-a09a-2b87c50c81ec"

# Run all tasks manually for one book
node enrichment-tasks/task-01-cover-urls.js "<book-id>"
node enrichment-tasks/task-02-authors.js "<book-id>"
node enrichment-tasks/task-03-summary.js "<book-id>"
# ... and so on

⚠️  **Before Task 6:** run `npm run evidence:sync -- <book-id>` if the book has harvested `source_snapshots`. This copies the latest extracts + snapshot IDs into the enrichment JSON so `task-06-cross-tags.js` can attach provenance metadata (`provenance_snapshot_ids`, `method`) to every tag suggestion.

If deterministic matching plus manual edits can’t reach 10-20 tags, use the LLM helper (requires `OPENAI_API_KEY`):

```bash
npm run enrichment:cross-tags -- "<book-id>"
```

The script reads the enrichment JSON (summary + evidence extracts), calls the LLM, and merges any returned tags with provenance (`method: llm` or `hybrid`).

### Push Enrichment Live
After tasks 1-7 are complete for a book:

```bash
# Preview (no writes)
npm run enrichment:apply -- --dry-run "<book-id>"

# Apply to Neon
npm run enrichment:apply -- "<book-id>"
```

The apply script updates the `books` table and all taxonomy link tables, and writes cross-tags with `confidence`, `method`, and `source_ids` so provenance flows into production.
```

### Option 2: Run All Tasks for All Books (Master Script)

```bash
node enrich-batch.js
```

This will:
1. Read all books from `books_batch_001.json`
2. Run tasks 1-8 for each book sequentially
3. Generate enrichment data and SQL for all books
4. Provide a summary report

## 📊 Understanding the Data Flow

```
books_batch_001.json
        ↓
Task 1: Cover URLs → enrichment_data/<id>.json (cover_urls added)
        ↓
Task 2: Authors → enrichment_data/<id>.json (authors added)
        ↓
Task 3: Summary → enrichment_data/<id>.json (summary status added)
        ↓
Task 4: Domain/Supergenres → enrichment_data/<id>.json (taxonomy.domain, taxonomy.supergenres)
        ↓
Task 5: Genres/Subgenres → enrichment_data/<id>.json (taxonomy.genres, taxonomy.subgenres)
        ↓
Task 6: Cross-tags → enrichment_data/<id>.json (taxonomy.cross_tags)
        ↓
Task 7: Format/Audience → enrichment_data/<id>.json (format, audience)
        ↓
Task 8: Generate SQL → enrichment_sql/<id>.sql
```

## ✅ Benefits of This Approach

1. **Idempotent**: Each task can be re-run safely without side effects
2. **Resumable**: If a task fails, just re-run that task
3. **Debuggable**: Easy to see what each task produced
4. **Incremental**: Data accumulates step-by-step
5. **Parallel-friendly**: Tasks can be parallelized in the future
6. **Testable**: Each task can be tested independently

## 🔧 Manual Steps Required

### Task 3: Summary Writing

Task 3 marks books as `needs_rewrite` or `needs_generation`. You must:

1. Read the enrichment data: `enrichment_data/<book-id>.json`
2. Look at `summary.original_description`
3. Write an original 150-300 word summary (no spoilers, no marketing language)
4. Update the JSON:
   ```json
   {
     "summary": {
       "original_description": "...",
       "new_summary": "YOUR ORIGINAL SUMMARY HERE",
       "new_length": 250,
       "word_count": 42,
       "status": "complete"
     }
   }
   ```
5. Re-run Task 8 to regenerate SQL with the new summary

## 📋 Quality Checks

After running all tasks, review enrichment data for:

- ✅ Authors present (REQUIRED)
- ✅ Summary written (REQUIRED for final SQL)
- ✅ Domain assigned (REQUIRED)
- ✅ At least 1 supergenre
- ✅ At least 1 genre
- ✅ At least 10 cross-tags
- ⚠️  Cover URL (optional but recommended)
- ⚠️  Format (optional)
- ⚠️  Audience (suggested but review confidence)

## 🐛 Troubleshooting

### Task fails with "Book not found"
- Ensure the book ID is in `books_batch_001.json`
- Check that you're using the correct UUID format

### Task 8 generates empty SQL
- Run tasks 1-7 first to accumulate enrichment data
- Check that `enrichment_data/<book-id>.json` exists and has data

### Summary not appearing in SQL
- Task 3 only prepares the summary
- You must manually write `summary.new_summary` in the JSON
- Re-run Task 8 after adding the summary

## 📚 Next Steps

After enrichment is complete:

1. ✅ Review all enrichment_data/*.json files
2. ✅ Manually write summaries where needed
3. ✅ Combine SQL files into batch migration
4. ✅ Generate batch report and issues log
5. ✅ Test SQL on staging database
6. ✅ Apply to production

---

**Created:** 2025-10-23  
**Version:** 1.0  
**Approach:** Micro-task modular enrichment workflow
# Push Enrichment Live
After tasks 1-7 are complete for a book:

```bash
# Preview (no writes)
npm run enrichment:apply -- --dry-run "<book-id>"

# Apply to Neon
npm run enrichment:apply -- "<book-id>"
```

The apply script updates the `books` table and all taxonomy link tables, and writes cross-tags with `confidence`, `method`, and `source_ids` so provenance flows into production.

### Task 8 – Lint / Optional SQL
Use Task 8 as a quality gate rather than the source of truth:

```bash
# Lint only (default)
node enrichment-tasks/task-08-generate-sql.js "<book-id>"

# Lint + regenerate SQL artifact
node enrichment-tasks/task-08-generate-sql.js --write-sql "<book-id>"
```

The lint step enforces:
- Validated authors present
- Rewritten summary present
- Domain, supergenres/genres/subgenres assigned
- 10-20 cross-tags
- Audience + format detected

Run it before `npm run enrichment:apply` to catch gaps early. The optional SQL output is kept for reviewers who still want to diff the generated statements.
