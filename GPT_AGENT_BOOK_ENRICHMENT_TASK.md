# GPT Agent Research Task: Book Metadata Enrichment

## 🎯 Mission
Enrich the Bookshelves database with high-quality metadata for 10,000+ books, ensuring proper categorization, tagging, and deduplication according to the established schema.

## ⏱️ Time Management (CRITICAL)
- **Session Timeout**: 20-40 minutes
- **Batch Strategy**: Work in incremental batches with saved progress
- **Resumable Design**: Each batch outputs independent SQL files that can be applied separately

## 📊 Batch Structure (Work Smart, Not Hard)

### Phase 1: Foundation (15 minutes)
**Goal**: Get schema understanding and create taxonomy reference
1. Read schema from `shared/schema.ts` in GitHub repo
2. Query database to export current taxonomy (all valid values)
3. Create master reference file: `TAXONOMY_REFERENCE.json`
4. **Output**: Save this file immediately - it's reusable across sessions

### Phase 2: Analysis (10 minutes)  
**Goal**: Understand current data quality
1. Query: `SELECT id, title, authors, description, categories FROM books LIMIT 100`
2. Analyze patterns in existing data
3. Identify common data quality issues
4. **Output**: `DATA_QUALITY_REPORT.md` with findings

### Phase 3: Batch Processing (Repeatable - 30 min per batch)
**Goal**: Process 500-1000 books per session with saved checkpoints

#### Work in Batches of 500 Books
```sql
-- Batch 1: Books 1-500
SELECT * FROM books ORDER BY id LIMIT 500 OFFSET 0;

-- Batch 2: Books 501-1000  
SELECT * FROM books ORDER BY id LIMIT 500 OFFSET 500;

-- Continue...
```

**For Each Batch**:
1. Load books from database
2. Enrich metadata (see requirements below)
3. Generate SQL migration file: `migration_batch_N.sql`
4. Save checkpoint: `progress.json` (tracks last processed book ID)
5. **STOP and save** before timeout

#### Resume Strategy
Each new session:
1. Read `progress.json` to see last completed batch
2. Continue from next offset
3. Append to master log

---

## 📚 Required Metadata (Per Book)

### 1. Publication Information
- `publishedDate`: Original publication date (YYYY-MM-DD or YYYY)
- Verify against multiple sources if available
- Note: Multiple editions = multiple release_events in your system

### 2. Taxonomy Classification (Use Link Tables)

**Books can have MULTIPLE of each category:**

#### Genres (book_genre_links table)
- Primary genre (required)
- Secondary genres (if applicable)
- Valid values from `genres` table

#### Subgenres (book_subgenre_links table)
- At least 1 subgenre if applicable
- Valid values from `subgenres` table
- Must belong to one of the book's assigned genres

#### Tags (book_tag_links table)
- **Minimum 10 tags per book**
- **Recommended 15-20 tags** for rich discovery
- Mix of:
  - Thematic tags (e.g., "coming-of-age", "family-drama")
  - Setting tags (e.g., "urban", "historical-1920s")
  - Plot tags (e.g., "mystery", "slow-burn-romance")
  - Character tags (e.g., "female-protagonist", "found-family")
  - Tone tags (e.g., "dark", "humorous", "inspirational")
- Valid values from `tags` table

#### Domains (book_domain_links table)
- Can have multiple (e.g., fiction + humor)
- Valid values from `domains` table

#### Supergenres (book_supergenre_links table)
- Broad category grouping
- Can have multiple
- Valid values from `supergenres` table

#### Format (book_format_links table)
- hardcover, paperback, ebook, audiobook
- Multiple if different editions exist
- Valid values from `formats` table

#### Audience (book_audience_links table)
- adult, young-adult, middle-grade, children
- Valid values from `audiences` table

### 3. Content Flags (book_tag_links with tags.group = 'content_warnings')
Apply where relevant:
- Violence, sexual content, substance abuse, mental health, etc.
- Use existing tags with `group = 'content_warnings'` or `group = 'content_flags'`

### 4. Summary Quality
**Clean and improve book descriptions:**
- Remove: "This New York Times bestseller...", "Don't miss...", publisher marketing
- Remove: Spoilers beyond first act
- Keep: Plot premise, main characters, setting, genre hooks
- Add: If summary is missing, generate 2-3 paragraph summary
- Length: 150-300 words ideal

### 5. Work/Edition Deduplication
**Identify duplicate works:**
- Same normalized title + same primary author = same work
- Different ISBNs/publication dates = different editions
- Create entries in:
  - `works` table (one per unique work)
  - `editions` table (one per physical book)
  - `release_events` table (publication milestones)

**Matching Rules:**
```
Title normalization:
- Remove articles (The, A, An)
- Remove subtitles after ":"
- Lowercase
- Remove punctuation

Author normalization:  
- Last name comparison
- Handle pseudonyms (use your knowledge)
```

---

## 🗄️ Database Schema Reference

### Key Tables (from shared/schema.ts)

```typescript
// Core tables
books: { id, google_books_id, title, authors[], description, cover_url, published_date, page_count, categories[], isbn }

// Taxonomy tables
genres: { id, slug, name }
subgenres: { id, slug, name, genre_slug }
tags: { id, slug, name, group }
domains: { id, slug, name }
supergenres: { id, slug, name }
audiences: { id, slug, name }
formats: { id, slug, name }

// Link tables (many-to-many)
book_genre_links: { book_id, genre_slug }
book_subgenre_links: { book_id, subgenre_slug }
book_tag_links: { book_id, tag_slug }
book_domain_links: { book_id, domain_slug }
book_supergenre_links: { book_id, supergenre_slug }
book_audience_links: { book_id, audience_slug }
book_format_links: { book_id, format_slug }

// Works/Editions (publication dating)
works: { id, title, authors[], description, series, original_publication_date, display_edition_id }
editions: { id, work_id, google_books_id, isbn, edition_name, format, publication_date }
release_events: { id, edition_id, event_date, event_type, confidence, notes }
```

### Event Types for release_events:
- ORIGINAL_RELEASE
- FORMAT_FIRST_RELEASE (e.g., first paperback)
- MAJOR_REISSUE_PROMO
- NEW_TRANSLATION
- REVISED_EXPANDED

---

## 🎯 Genre Distribution Goals

Ensure broad coverage across all genres:

| Genre | Target Books | Priority |
|-------|--------------|----------|
| Fantasy | 1500 | High |
| Science Fiction | 1200 | High |
| Mystery/Thriller | 1200 | High |
| Romance | 1000 | High |
| Literary Fiction | 800 | Medium |
| Horror | 600 | Medium |
| Historical Fiction | 500 | Medium |
| Contemporary Fiction | 500 | Medium |
| Non-Fiction | 800 | Medium |
| Young Adult | 700 | Medium |
| Biography/Memoir | 400 | Low |
| Poetry/Drama | 300 | Low |
| Other genres | 500 | Low |

**Total: 10,000 books**

Include mix of:
- 30% classics (pre-1990)
- 40% modern (1990-2010)
- 30% recent (2010-present)

---

## 💾 Output Files (Per Batch)

### 1. Migration SQL: `migration_batch_N.sql`
```sql
-- Batch N: Books 1-500
-- Generated: [timestamp]

-- Update book summaries
UPDATE books SET description = '...' WHERE id = '...';

-- Insert taxonomy links
INSERT INTO book_genre_links (book_id, genre_slug) VALUES 
  ('book-id-1', 'fantasy'),
  ('book-id-1', 'adventure');

INSERT INTO book_tag_links (book_id, tag_slug) VALUES
  ('book-id-1', 'epic-fantasy'),
  ('book-id-1', 'magic-system'),
  -- ... 10+ tags per book

-- Insert works/editions
INSERT INTO works (id, title, authors, ...) VALUES (...);
INSERT INTO editions (id, work_id, google_books_id, ...) VALUES (...);

-- Continue for all 500 books...
```

### 2. Progress Checkpoint: `progress.json`
```json
{
  "last_batch": 3,
  "last_book_id": "book-id-1500",
  "books_processed": 1500,
  "timestamp": "2025-10-22T20:47:00Z",
  "next_offset": 1500
}
```

### 3. Batch Report: `batch_N_report.md`
```markdown
# Batch N Report

## Stats
- Books processed: 500
- Summaries cleaned: 320
- Works identified: 485
- Duplicate editions: 15

## Issues
- Missing publication dates: 5 books
- No valid genre found: 2 books

## Next Steps
- Continue with batch N+1 at offset [next_offset]
```

---

## 🔍 Data Sources

### Primary: Your Knowledge Base
Use your training data knowledge of books (you know millions of them!)

### Secondary: APIs (Only if needed)
```bash
# Google Books API
https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}

# Open Library API  
https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
```

### Tertiary: Database Inference
- Look at existing `categories` field in books table
- Infer genres from book description
- Use author's other works as context

---

## ✅ Quality Checks (Per Batch)

Before outputting SQL:
1. ✅ Every book has at least 1 genre
2. ✅ Every book has 10+ tags
3. ✅ No invalid taxonomy slugs (all must exist in master tables)
4. ✅ Descriptions are 150-300 words
5. ✅ Publication dates are valid (YYYY or YYYY-MM-DD)
6. ✅ No duplicate work IDs across batches

---

## 🚀 Execution Plan

### Session 1 (Foundation)
```bash
# What to do:
1. Clone/read repo: https://github.com/Crake77/Bookshelves
2. Read shared/schema.ts
3. Query database for current taxonomy
4. Create TAXONOMY_REFERENCE.json
5. Analyze sample of 100 books
6. Output DATA_QUALITY_REPORT.md

# Time: ~15 minutes
# Outputs: 2 files (reusable)
```

### Session 2-N (Batch Processing)
```bash
# What to do:
1. Read progress.json (if exists, else start at 0)
2. Query: SELECT * FROM books LIMIT 500 OFFSET [last_offset]
3. For each book:
   - Enrich metadata
   - Generate SQL statements
4. Write migration_batch_N.sql
5. Update progress.json
6. Write batch_N_report.md

# Time: ~30 minutes per batch
# Output: 3 files per batch
# Books per session: 500-1000 depending on complexity
```

### Resuming After Timeout
```bash
# Start new session:
1. Read progress.json
2. Continue from next_offset
3. Increment batch number
4. Don't regenerate TAXONOMY_REFERENCE.json (reuse it)
```

---

## 📋 SQL Template

```sql
-- migration_batch_1.sql
-- Books 1-500 enrichment
-- Generated: 2025-10-22

BEGIN;

-- Clean existing links for this batch (for re-runs)
DELETE FROM book_genre_links WHERE book_id IN (SELECT id FROM books LIMIT 500);
DELETE FROM book_tag_links WHERE book_id IN (SELECT id FROM books LIMIT 500);
-- ... other link tables

-- Book 1: The Name of the Wind
UPDATE books 
SET 
  description = 'A young man grows to be the most notorious magician his world has ever seen. From his childhood in a troupe of traveling players, to years spent as a near-feral orphan in a crime-riddled city, to his daringly brazen yet successful bid to enter a legendary school of magic.',
  published_date = '2007-03-27',
  page_count = 662
WHERE id = 'book-id-1';

INSERT INTO book_genre_links (book_id, genre_slug) VALUES
  ('book-id-1', 'fantasy'),
  ('book-id-1', 'adventure');

INSERT INTO book_tag_links (book_id, tag_slug) VALUES
  ('book-id-1', 'epic-fantasy'),
  ('book-id-1', 'magic-school'),
  ('book-id-1', 'coming-of-age'),
  ('book-id-1', 'first-person-pov'),
  ('book-id-1', 'male-protagonist'),
  ('book-id-1', 'found-family'),
  ('book-id-1', 'music'),
  ('book-id-1', 'mystery-elements'),
  ('book-id-1', 'slow-burn'),
  ('book-id-1', 'worldbuilding'),
  ('book-id-1', 'intricate-plot'),
  ('book-id-1', 'frame-narrative'),
  ('book-id-1', 'tavern-setting');

INSERT INTO book_audience_links (book_id, audience_slug) VALUES
  ('book-id-1', 'adult');

INSERT INTO book_format_links (book_id, format_slug) VALUES
  ('book-id-1', 'hardcover');

-- Works/Editions
INSERT INTO works (id, title, authors, description, original_publication_date, display_edition_id)
VALUES (
  'work-name-of-wind',
  'The Name of the Wind',
  ARRAY['Patrick Rothfuss'],
  'A young man grows to be the most notorious magician...',
  '2007-03-27',
  'book-id-1'
);

INSERT INTO editions (id, work_id, google_books_id, publication_date, format)
VALUES (
  'edition-notw-hardcover',
  'work-name-of-wind',
  'book-id-1',
  '2007-03-27',
  'hardcover'
);

-- Repeat for books 2-500...

COMMIT;
```

---

## 🎯 Success Criteria

After all batches complete:
- ✅ 10,000+ books enriched
- ✅ Each book has 10+ tags
- ✅ All genres have 200+ books minimum
- ✅ 90%+ books have clean summaries
- ✅ Duplicate works identified and linked
- ✅ All SQL files tested and ready to apply

---

## 🚨 Important Notes

1. **Don't lose work**: Save files frequently, especially progress.json
2. **Test SQL**: Each batch SQL should be syntactically valid
3. **Use existing taxonomy**: Don't create new genres/tags - use what exists
4. **Conservative tagging**: When uncertain, skip rather than guess
5. **Book IDs**: Use the actual database IDs, don't generate UUIDs

---

## 📞 Getting Started

1. Access the database connection string from environment
2. Read this entire document
3. Execute Session 1 (Foundation)
4. Start batch processing
5. Report progress after each batch

## Database Connection
```bash
# Already configured in your environment
DATABASE_URL=postgresql://...
```

---

**Ready to start? Begin with Session 1 (Foundation) and work incrementally!**

---

## Appendix: Current Taxonomy Reference

Query these to get valid values:
```sql
SELECT slug, name FROM genres ORDER BY name;
SELECT slug, name, group FROM tags ORDER BY group, name;
SELECT slug, name FROM domains ORDER BY name;
SELECT slug, name FROM audiences ORDER BY name;
SELECT slug, name FROM formats ORDER BY name;
```

Export as JSON and reference throughout the job.

---

**End of Task Document**
