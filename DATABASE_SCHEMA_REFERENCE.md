# Database Schema Reference

**Purpose:** Complete reference for enrichment scripts and AI agents  
**Database:** Neon PostgreSQL (serverless)  
**Connection:** Via `DATABASE_URL` in `.env.local`

---

## 📊 Core Metadata Tables

### `books`
Primary book table with core metadata.

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | UUID | Primary key | Generated for new books |
| `title` | TEXT | Book title | Required |
| `authors` | TEXT[] | Array of author names | **PostgreSQL array, NOT JSON**<br/>Use `ARRAY['Author 1', 'Author 2']` syntax |
| `isbn` | TEXT | ISBN identifier | May be ISBN-10, ISBN-13, or OCLC |
| `published_date` | TEXT | Publication date | Format varies (YYYY, YYYY-MM-DD) |
| `page_count` | INTEGER | Number of pages | Nullable |
| `description` | TEXT | Book summary/description | Enriched summaries go here |
| `cover_url` | TEXT | Cover image URL | From Google Books or OpenLibrary |
| `google_books_id` | TEXT | Google Books ID | For API lookups |
| `categories` | TEXT[] | Original API categories | **PostgreSQL array** |

**Critical Notes:**
- `authors` is `TEXT[]` (PostgreSQL array type), NOT `JSON` or `JSONB`
- Correct SQL: `UPDATE books SET authors = ARRAY['Name 1', 'Name 2']`
- Wrong SQL: `UPDATE books SET authors = '["Name 1", "Name 2"]'`

---

## 🏷️ Taxonomy Tables

### Taxonomy Hierarchy
```
domains (2: fiction, non-fiction)
  ↓
supergenres (34 total)
  ↓
genres (101 total)
  ↓
subgenres (500 total)

cross_tags (2,733 total) — independent, multi-dimensional
age_markets (audience) — independent
formats — independent
```

---

### `domains`
Top-level classification: fiction vs. non-fiction.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-safe identifier (e.g., "fiction") |
| `name` | TEXT | Display name (e.g., "Fiction") |
| `description` | TEXT | Optional description |

**Values:**
- `fiction`
- `non-fiction`

**Source:** NOT in `bookshelves_complete_taxonomy.json` — must be managed manually in database.

---

### `supergenres`
High-level genre groupings (e.g., "Speculative Fiction", "Romance").

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-safe identifier |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |

**Count:** 34  
**Source:** `bookshelves_complete_taxonomy.json → supergenres[]`

---

### `genres`
Primary genre classification (e.g., "Science Fiction", "Mystery").

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-safe identifier |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |

**Count:** 101  
**Source:** `bookshelves_complete_taxonomy.json → genres[]`

---

### `subgenres`
Detailed genre subdivisions (e.g., "Space Opera", "Cozy Mystery").

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-safe identifier |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |
| `genre_id` | UUID | Foreign key to `genres.id` |

**Count:** 500  
**Source:** `bookshelves_complete_taxonomy.json → subgenres[]`  
**Relationship:** Each subgenre belongs to exactly one genre.

---

### `cross_tags`
Multi-dimensional metadata tags (tropes, themes, tone, content warnings, etc.).

| Column | Type | Description | **CRITICAL** |
|--------|------|-------------|--------------|
| `id` | UUID | Primary key | |
| `slug` | TEXT | URL-safe identifier | |
| `name` | TEXT | Display name | |
| `group` | TEXT | Tag category | **Column is named `group`, NOT `tag_group`** |
| `description` | TEXT | Optional description | |
| `enabled` | BOOLEAN | Active flag | Default true |

**Count:** 2,733  
**Source:** `bookshelves_complete_taxonomy.json → cross_tags.by_group{}`

**Tag Groups:**
| Group | Count | Examples |
|-------|-------|----------|
| `trope` | 1,226 | chosen-one, enemies-to-lovers, time-travel |
| `representation` | 305 | lgbtq+, disability-rep, bipoc-mc |
| `plot` | 284 | revenge, redemption, coming-of-age |
| `tone` | 195 | dark, humorous, philosophical |
| `content_warning` | 190 | violence, sexual-content, abuse |
| `style` | 139 | lyrical, minimalist, stream-of-consciousness |
| `tropes_themes` | 106 | identity, power, love |
| `content_flags` | 72 | explicit, graphic, mature |
| `setting` | 65 | urban, space, medieval |
| `tone_mood` | 55 | melancholic, suspenseful, whimsical |
| `market` | 55 | bestseller, debut, novella |
| `structure` | 41 | anthology, epistolary, flash-fiction |

**CRITICAL:** Column name is `group`, not `tag_group`. Must escape in SQL:
```sql
INSERT INTO cross_tags (slug, name, "group") VALUES ('foo', 'Foo', 'trope');
```

---

### `age_markets`
Audience/age classification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-safe identifier |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |

**Values:**
- `adult` (default for general audience)
- `young-adult` (YA)
- `middle-grade`
- `children`

**Source:** NOT in `bookshelves_complete_taxonomy.json` — must be managed manually.

**UI Note:** Frontend displays this as "Audience" but table name is `age_markets`.

---

### `formats`
Physical/digital format classification.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `slug` | TEXT | URL-safe identifier |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |

**Common Values:**
- `hardcover`
- `paperback`
- `ebook`
- `audiobook`
- `anthology` (for short story collections)

**Source:** NOT in `bookshelves_complete_taxonomy.json` — must be managed manually.

---

## 🔗 Junction Tables (Many-to-Many Relationships)

### `book_domains`
Links books to domains (fiction/non-fiction).

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `domain_id` | UUID | FK to `domains.id` |

**Cardinality:** Each book has exactly 1 domain.

---

### `book_supergenres`
Links books to supergenres.

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `supergenre_id` | UUID | FK to `supergenres.id` |

**Cardinality:** Each book has 1-2 supergenres.

---

### `book_genres`
Links books to genres.

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `genre_id` | UUID | FK to `genres.id` |

**Cardinality:** Each book has 1-3 genres.

---

### `book_subgenres`
Links books to subgenres.

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `subgenre_id` | UUID | FK to `subgenres.id` |

**Cardinality:** Each book has 0-5 subgenres.

---

### `book_cross_tags`
Links books to cross-tags.

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `cross_tag_id` | UUID | FK to `cross_tags.id` |

**Cardinality:** Each book should have 10-20 cross-tags (enrichment target).

---

### `book_age_markets`
Links books to audience/age classifications.

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `age_market_id` | UUID | FK to `age_markets.id` |

**Cardinality:** Each book has 0-1 age market (usually 1, defaults to "adult").

---

### `book_formats`
Links books to formats.

| Column | Type | Description |
|--------|------|-------------|
| `book_id` | UUID | FK to `books.id` |
| `format_id` | UUID | FK to `formats.id` |

**Cardinality:** Each book has 0-1 format (often unknown from metadata).

---

## 🚨 Common Pitfalls

### 1. Authors Field Type Confusion
**Wrong:**
```sql
UPDATE books SET authors = '["Author Name"]' WHERE id = '...';
```

**Correct:**
```sql
UPDATE books SET authors = ARRAY['Author Name'] WHERE id = '...';
```

The `authors` column is `TEXT[]` (PostgreSQL array), NOT JSON.

---

### 2. Cross-Tags Column Name
**Wrong:**
```sql
INSERT INTO cross_tags (slug, name, tag_group) VALUES ('foo', 'Foo', 'trope');
```

**Correct:**
```sql
INSERT INTO cross_tags (slug, name, "group") VALUES ('foo', 'Foo', 'trope');
```

Column is named `group` (reserved keyword, must be quoted).

---

### 3. Missing Taxonomy Items
**Problem:** Enrichment scripts reference slugs from `bookshelves_complete_taxonomy.json`, but not all items are in the database yet.

**Solution:** Run `node sync-taxonomy.js` before each batch to ensure all taxonomy items exist in the database. This script is idempotent (safe to run multiple times).

---

### 4. Taxonomy Source Files
| Metadata Type | In JSON? | Source |
|---------------|----------|--------|
| Genres | ✅ Yes | `bookshelves_complete_taxonomy.json` |
| Subgenres | ✅ Yes | `bookshelves_complete_taxonomy.json` |
| Supergenres | ✅ Yes | `bookshelves_complete_taxonomy.json` |
| Cross-tags | ✅ Yes | `bookshelves_complete_taxonomy.json` |
| Domains | ❌ No | Manual database management |
| Age Markets | ❌ No | Manual database management |
| Formats | ❌ No | Manual database management |

**Note:** `bookshelves_complete_taxonomy.json` does NOT include domains, age_markets, or formats. These must be managed separately.

---

### 5. UI Display Name Mismatches
| Database Table | UI Label | Notes |
|----------------|----------|-------|
| `age_markets` | "Audience" | Column mismatch can cause confusion |
| `formats` | "Format" | Same name |
| `domains` | Not displayed | Internal classification |

---

## 🔧 Tools & Scripts

### `sync-taxonomy.js`
**Purpose:** Sync all taxonomy items from JSON to database  
**Usage:** `node sync-taxonomy.js`  
**Frequency:** Run before each batch OR when taxonomy JSON is updated  
**Idempotent:** Yes (safe to run multiple times)

**What it syncs:**
- ✅ Supergenres (34 items)
- ✅ Genres (101 items)
- ✅ Subgenres (500 items)
- ✅ Cross-tags (2,733 items)
- ❌ Domains (not in JSON)
- ❌ Age markets (not in JSON)
- ❌ Formats (not in JSON)

---

## 📝 Enrichment Workflow Integration

### Step 0 (NEW): Taxonomy Sync
**Before exporting books**, run:
```powershell
node sync-taxonomy.js
```

This ensures all taxonomy slugs referenced in enrichment tasks exist in the database.

### Step 8: SQL Generation
**Script:** `task-08-generate-sql.js`

**Critical Requirements:**
1. Use `ARRAY[]` syntax for authors field
2. Quote `"group"` column name in cross_tags inserts
3. All taxonomy slugs MUST exist in database (run sync first)
4. Use `SELECT ... FROM table WHERE slug = 'foo'` for ID lookups

**Example SQL:**
```sql
-- Update book metadata
UPDATE books SET
  authors = ARRAY['Samuel R. Delany'],  -- PostgreSQL array syntax
  description = '...',
  cover_url = '...'
WHERE id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id 
FROM domains WHERE slug = 'fiction';

-- Insert cross-tags (note quoted "group" column)
INSERT INTO cross_tags (slug, name, "group") 
VALUES ('space-opera', 'Space Opera', 'trope');
```

---

## 🎯 Required Reading for AI Agents

Before starting enrichment, AI agents MUST read:
1. ✅ `WARP.md` — General agent guidelines
2. ✅ `AGENTS.md` — Project environment (Windows, PostgreSQL, Node.js)
3. ✅ `WARP-WORKFLOW.md` — Development standards
4. ✅ `GPT_METADATA_ENRICHMENT_GUIDE.md` — Quality standards
5. ✅ `bookshelves_complete_taxonomy.json` — Taxonomy data
6. ✅ **`DATABASE_SCHEMA_REFERENCE.md`** — This file (column names, data types, sources)

---

## 🔍 Quick Reference Queries

### Check if taxonomy item exists:
```sql
SELECT id, name FROM genres WHERE slug = 'science-fiction';
SELECT id, name FROM cross_tags WHERE slug = 'space-opera';
SELECT id, name FROM age_markets WHERE slug = 'adult';
```

### Check book's current taxonomy:
```sql
SELECT 
  b.title,
  d.name as domain,
  array_agg(DISTINCT g.name) as genres,
  array_agg(DISTINCT ct.name) as cross_tags,
  am.name as audience
FROM books b
LEFT JOIN book_domains bd ON b.id = bd.book_id
LEFT JOIN domains d ON bd.domain_id = d.id
LEFT JOIN book_genres bg ON b.id = bg.book_id
LEFT JOIN genres g ON bg.genre_id = g.id
LEFT JOIN book_cross_tags bct ON b.id = bct.book_id
LEFT JOIN cross_tags ct ON bct.cross_tag_id = ct.id
LEFT JOIN book_age_markets bam ON b.id = bam.book_id
LEFT JOIN age_markets am ON bam.age_market_id = am.id
WHERE b.id = 'BOOK_ID_HERE'
GROUP BY b.title, d.name, am.name;
```

---

**Last Updated:** 2025-10-23  
**Version:** 1.0
