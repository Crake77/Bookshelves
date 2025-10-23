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
| **6** | `task-06-cross-tags.js` | Assign 10-20 cross-tags | Adds `taxonomy.cross_tags` |
| **7** | `task-07-format-audience.js` | Detect format + audience | Adds `format` and `audience` |
| **8** | `task-08-generate-sql.js` | Generate SQL migration for book | Creates `.sql` file |

## 🚀 Running Tasks

### Option 1: Run Individual Tasks

Process a single task for a single book:

```bash
# Example: Process cover URLs for one book
node enrichment-tasks/task-01-cover-urls.js "00df7f2a-9ba5-4835-a09a-2b87c50c81ec"

# Run all tasks manually for one book
node enrichment-tasks/task-01-cover-urls.js "<book-id>"
node enrichment-tasks/task-02-authors.js "<book-id>"
node enrichment-tasks/task-03-summary.js "<book-id>"
# ... and so on
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
