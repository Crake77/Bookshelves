# GPT Agent: Book Metadata Enrichment Guide

**Version:** 2.1  
**Agent Role:** Metadata Enrichment Specialist
**Task:** Enrich book records with summaries, taxonomy tags, and complete metadata while respecting copyright  
**Batch Size:** 100-500 books per session (30-40 minute window)  
**Database:** Neon PostgreSQL (production)

---

## 🎯 AGENT MISSION STATEMENT

You are a metadata enrichment specialist responsible for transforming basic book records into richly annotated catalog entries. Your primary objectives are:

1. **Extract and validate authors** (REQUIRED - at least one author per book)
2. **Create original, legally compliant summaries** (150-300 words, spoiler-free)
3. **Apply comprehensive taxonomy tags** (domains, supergenres, genres, subgenres, cross-tags)
4. **Populate ALL missing metadata fields** (dates, page counts, formats, audiences)
5. **Process existing tags** from API sources (following copyright rules - rewrite descriptions only)
6. **Maintain progress logs** for seamless session resumption
7. **Ensure data quality** through validation checks

**Critical Rule:** ALL summaries from external sources MUST be completely rewritten in your own words. Never copy-paste descriptions from Google Books, Amazon, Goodreads, or publishers.

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting each batch, verify you have access to:

- [ ] **Taxonomy Reference:** `BOOKSHELVES_TAXONOMY_REFERENCE.md` + `bookshelves_complete_taxonomy.json`
- [ ] **Database Schema:** Current books table structure
- [ ] **Progress Log:** `enrichment_progress.json` (create if first run)
- [ ] **Current Batch:** List of book IDs to process (query from database)
- [ ] **API Access:** Google Books API, OpenLibrary API ready

---

## 🔄 WORKFLOW OVERVIEW

```
┌─────────────────────────────────────────┐
│ 1. Load Progress & Select Batch        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Fetch External Data (APIs)          │
│    - Google Books, OpenLibrary          │
│    - Cache results locally              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. For Each Book: Process Metadata     │
│    ├── Authors (REQUIRED)              │
│    ├── Summary (MUST rewrite)          │
│    ├── Published Date                  │
│    ├── Page Count                      │
│    ├── Format (hardcover/ebook/etc)    │
│    ├── Audience (YA/adult/children)    │
│    └── Existing API tags/categories    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. Apply Taxonomy Tags (IN ORDER)      │
│    ├── Domain (1 required)             │
│    │   └── fiction/non-fiction/poetry  │
│    ├── Supergenres (1-2 required)      │
│    ├── Genres (1-3 required)           │
│    ├── Subgenres (1-5 recommended)     │
│    ├── Cross-tags (10-20 required)     │
│    │   ├── trope (narrative patterns)  │
│    │   ├── representation (diversity)  │
│    │   ├── plot (story structure)      │
│    │   ├── tone (mood/atmosphere)      │
│    │   ├── content_warning (sensitive) │
│    │   ├── style (writing technique)   │
│    │   ├── setting (time/place)        │
│    │   └── market (audience/position)  │
│    ├── Format tags (if known)          │
│    └── Audience tags (if applicable)   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 5. Quality Validation                  │
│    - Summary originality check         │
│    - Required fields present           │
│    - Tag validity verification         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 6. Generate SQL Migration              │
│    - UPDATE books (authors, summary)   │
│    - INSERT taxonomy links             │
│    - Idempotent (DELETE first)         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 7. Update Progress Log & Save          │
└─────────────────────────────────────────┘
```

---

## 📊 PART 0: BATCH PRIORITIZATION STRATEGY

**CRITICAL:** Process the most popular/impactful books FIRST to maximize immediate value.

### Why Prioritize by Popularity?

- Users discover popular books first
- Trending titles drive traffic and engagement
- Classic bestsellers have highest search volume
- Processing 1,000 popular books > 10,000 obscure titles

### Popularity Signals to Use

**⚠️ LEGAL REQUIREMENT:** Only use **quantitative, non-copyright data**. Never scrape review text or descriptions.

**Safe Metrics:**

1. **OpenLibrary Data** (preferred - public API)
   - `ratings_average` - Average rating score
   - `ratings_count` - Number of ratings
   - `want_to_read_count` - Want-to-read count
   - `editions_count` - Number of editions published
   - `first_publish_year` - Publication year (older classics often popular)

2. **External Bestseller Ranks** (numeric only)
   - NYT Bestseller list positions (rank numbers only)
   - Amazon bestseller ranks (numeric rank, NOT descriptions)
   - Goodreads rating counts (count only, NOT review text)

3. **Public Datasets**
   - Curated "top 100" lists (titles + ranks only)
   - Award winner lists (book titles only)

**DO NOT USE:**
- ❌ Review text from any source
- ❌ Descriptions or summaries
- ❌ Star ratings with commentary
- ❌ User-generated content

###

 Composite Popularity Score Formula

**Calculate a single score per book:**

```
popularity_score = 
  (ratings_count * 0.4) +
  (want_to_read_count * 0.3) +
  (editions_count * 10 * 0.2) +
  (age_bonus * 0.1)

where:
  age_bonus = min(current_year - first_publish_year, 50)
```

**Rationale:**
- Ratings count: Most direct signal of readership
- Want-to-read: Indicates trending interest
- Editions: Multi-edition books are usually significant
- Age: Classic books (old + still popular) get bonus

### Batch Selection Query

**First Batch (Most Popular 100 books):**

```sql
WITH popularity_scores AS (
  SELECT 
    b.id,
    b.title,
    b.authors,
    COALESCE(b.ratings_count, 0) * 0.4 +
    COALESCE(b.want_to_read_count, 0) * 0.3 +
    COALESCE(b.editions_count, 0) * 10 * 0.2 +
    LEAST(EXTRACT(YEAR FROM NOW()) - COALESCE(EXTRACT(YEAR FROM b.published_date), 2024), 50) * 0.1
      AS popularity_score
  FROM books b
  WHERE b.description IS NULL  -- Only unenriched books
)
SELECT id, title, authors, popularity_score
FROM popularity_scores
ORDER BY popularity_score DESC
LIMIT 100;
```

**Subsequent Batches:**

```sql
-- Track which books are already enriched
-- Then select next 100 by descending popularity

SELECT id, title, authors
FROM popularity_scores
WHERE id NOT IN (SELECT book_id FROM enrichment_log)
ORDER BY popularity_score DESC
LIMIT 100 OFFSET 0;  -- Increment offset for each batch
```

### Alternative: Manual Curated Lists

If popularity data is unavailable, use manually curated lists:

1. **Start with classics:**
   - NYT Top 100 Books of All Time
   - Modern Library Best 100 Novels
   - BBC Big Read Top 100

2. **Then recent bestsellers:**
   - Past 5 years NYT bestsellers
   - Goodreads Choice Awards winners
   - Book of the Month selections

3. **Then genre-specific popular titles:**
   - Top fantasy (Sanderson, Rothfuss, Martin)
   - Top romance (Hoover, McQuiston, Kleypas)
   - Top mystery (Flynn, Patterson, Christie)

### Batch Ordering Rules

**Priority Order:**
1. Popularity score > 1000: Process FIRST (major bestsellers)
2. Popularity score 500-1000: Batch 2-5 (well-known titles)
3. Popularity score 100-500: Batch 6-20 (moderate popularity)
4. Popularity score < 100: Later batches (niche titles)

**Within each tier, sub-sort by:**
- Genre diversity (don't process 100 romance novels in a row)
- Recency (mix classic + contemporary)
- Series order (process series book 1 before book 5)

### Session Start Procedure

**Before starting PART 1, execute this:**

1. **Calculate popularity scores for all books**
   - Run composite score formula
   - Store in temporary table or in-memory

2. **Select current batch**
   - Query top 100 (or remaining) by score
   - Filter out already-enriched books
   - Store book IDs for processing

3. **Log batch composition**
   - Record average popularity score for batch
   - Note genre distribution
   - Document in batch report

**Example Output:**
```
✅ Batch 1 Selected
📊 100 books, avg popularity: 2,450
📚 Genres: 35% fantasy, 25% mystery, 20% romance, 20% other
⭐ Top title: "Dune" (score: 15,000)
```

---

## 📖 PART 1: SUMMARY ACQUISITION & REWRITING

### Step 1.1: Fetch Candidate Summaries

**API Sources (in priority order):**

1. **OpenLibrary API** (preferred - more open licensing)
   - Search: `https://openlibrary.org/search.json?title={title}&author={author}`
   - ISBN lookup: `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json`
   
2. **Google Books API** (secondary - good coverage)
   - Volume search: `https://www.googleapis.com/books/v1/volumes?q=intitle:{title}+inauthor:{author}`
   - ISBN lookup: `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`

3. **Your Internal Knowledge** (fallback for well-known books)
   - Only use when APIs return nothing useful
   - Generate from scratch based on book's known plot/themes

**What to Extract:**
- **Authors** (CRITICAL - required field)
  - Google: `volumeInfo.authors[]`
  - OpenLibrary: `author_name[]`
  - Validate: must have at least one author
- Description/summary text (MUST be rewritten - see Step 1.3)
- Publication date (published_date)
- Page count (page_count, pageCount, or number_of_pages)
- Categories/genres (existing tags - can be used to inform taxonomy, but descriptions must be rewritten)
- ISBN-10 and ISBN-13
- Publisher name
- Language
- Format information (hardcover, paperback, ebook, audiobook)
- Subject/topics (additional context for cross-tags)
- **Popularity signals** (for batch prioritization - see PART 0)
  - OpenLibrary: `ratings_average`, `want_to_read_count`, `editions_count`
  - External: Bestseller ranks (numeric only, no review text)

**Caching Strategy:**
- Store ALL fetched API responses in memory for the session
- If reprocessing a book, use cached data (don't re-call API)

### Step 1.2: Flag ALL External Summaries for Rewrite

**CRITICAL COPYRIGHT RULE:**

🚨 **EVERY summary from Google Books, OpenLibrary, Amazon, Goodreads, or any publisher website is copyrighted and CANNOT be used verbatim.** 🚨

**Automatic Flagging Rules:**
- ✅ **ALWAYS REWRITE** summaries from:
  - Google Books (publisher-provided descriptions)
  - OpenLibrary (may contain copied publisher text)
  - Amazon, Goodreads, Barnes & Noble
  - Any source without explicit CC0/Public Domain license
  
- ⚠️ **Warning Signs** (rewrite immediately if present):
  - Marketing language: "#1 bestseller", "Don't miss", "Award-winning"
  - Review quotes: "A tour de force" – The New York Times
  - Promotional tone: "thrilling conclusion", "stunning debut"
  - Identical text across multiple sites (likely publisher's jacket copy)

**The ONLY exception:** If you generate the summary entirely from your own knowledge without referencing any external text.

### Step 1.3: Rewrite Summary (MANDATORY)

**Rewriting Protocol:**

1. **Read and Internalize:** Understand the book's plot, characters, setting, themes from source(s)
2. **Set Aside Source Text:** Do NOT look at the original while writing
3. **Write From Scratch:** Explain the book as if describing it to a friend
4. **Length:** 150-300 words (aim for ~200)
5. **Structure:** 2-3 paragraphs
   - Para 1: Introduce protagonist, setting, initial situation
   - Para 2: Present central conflict/mystery/challenge
   - Para 3: Hint at stakes/themes (NO spoilers or endings)

**Style Requirements:**
- ✅ **DO:**
  - Use third-person, present tense ("Sarah discovers..." not "Sarah discovered...")
  - Focus on premise, NOT plot resolution
  - Mention main character(s) by name
  - Include setting (time/place) if relevant
  - Convey genre/tone organically ("In a dystopian future..." signals sci-fi)
  - Stay spoiler-free (only first act setup)
  - Write in clean, informative, neutral tone

- ❌ **DON'T:**
  - Copy ANY phrases longer than 3-4 words from sources
  - Include marketing language or superlatives
  - Reveal twists, endings, or major plot points beyond setup
  - Use promotional quotes or reviewer names
  - Add your own opinions ("This amazing book...")
  - Mention awards/bestseller status (that's separate metadata)

**Originality Verification:**
After writing, check that:
- No sentence matches source text structure
- No phrase of 4+ consecutive words is identical to source
- Summary reads like YOUR voice, not publisher's marketing copy
- If you spot similarities, rewrite those sections again

**Example Transformation:**

❌ **Original (Google Books):**
> "In this electrifying thriller from the #1 New York Times bestselling author, Detective Sarah Chen must race against time to stop a killer. Don't miss the stunning conclusion to the trilogy!"

✅ **Your Rewrite:**
> "Detective Sarah Chen faces her most challenging case when a series of murders points to a pattern only she can decode. As the body count rises, Sarah must navigate her own troubled past while tracking a killer who seems to know her every move. Set against the backdrop of Seattle's rainy streets, this crime thriller explores themes of obsession and justice."

---

## 🏷️ PART 2: COMPLETE METADATA EXTRACTION

### Step 2.1: Extract ALL Available Fields

For **EVERY** book, attempt to populate these fields from API responses:

#### Books Table Fields

| Field | Source Priority | Notes |
|-------|----------------|-------|
| **authors** | 1) Google volumeInfo.authors[]<br>2) OpenLibrary author_name[] | JSON array of strings (REQUIRED) |
| **description** | REWRITTEN SUMMARY | Your original text only |
| **published_date** | 1) Google publishedDate<br>2) OpenLibrary publish_date<br>3) Leave null if unknown | Format: YYYY-MM-DD or YYYY |
| **page_count** | 1) Google pageCount<br>2) OpenLibrary number_of_pages<br>3) Estimate from similar books | Integer only |
| **publisher** | 1) Google publisher<br>2) OpenLibrary publishers[0] | String |
| **language** | 1) Google language<br>2) Default to 'en' | ISO 639-1 code |
| **isbn** | Extract from identifiers | Prefer ISBN-13, fallback ISBN-10 |

**Date Handling:**
- If API returns "May 2011", convert to "2011-05" or just "2011"
- If only year available, use "YYYY" format
- Prefer original publication date over reprint dates when possible

**Page Count Handling:**
- Use integer values only (remove "pages" text)
- If range given (e.g., "200-250"), use midpoint (225)
- Skip if clearly wrong (e.g., 10 pages for a novel)

### Step 2.2: Determine Format (Physical vs Digital)

**Format Values:** hardcover, paperback, ebook, audiobook, mass-market-paperback

**Detection Logic:**
1. Check Google Books `printType` field
2. Check OpenLibrary format information
3. Check categories for "Audio" or "Electronic"
4. **If unknown:** Skip format assignment (don't guess)

**Important:** Each book record may represent ONE format. If you encounter metadata for multiple formats (hardcover AND ebook), prioritize the physical format (hardcover > paperback) since it's typically the "original" edition.

### Step 2.3: Extract Preliminary Audience/Age Market

**⚠️ NOTE:** This is preliminary extraction from API data. Final taxonomy assignment happens in Step 3.6.

**Audience Values:** adult, young-adult, middle-grade, children

**Detection Rules (from API categories/metadata):**
1. **children:** Ages 0-8, picture books, early readers
   - Keywords: "picture book", "ages 3-7", "board book"
   
2. **middle-grade:** Ages 8-12
   - Keywords: "middle grade", "ages 8-12", "juvenile fiction"
   
3. **young-adult:** Ages 13-18, teen protagonists
   - Keywords: "young adult", "YA", "teen", "ages 13+"
   - Protagonist age 14-18 + coming-of-age themes
   
4. **adult:** Default for general readership (18+)
   - Mature themes, adult protagonists, no age qualifier

**If Unclear:** Default to `adult` for fiction/non-fiction, or leave blank if truly uncertain.

**This preliminary detection will be finalized in Step 3.6 during taxonomy assignment.**

### Step 2.4: Extract Preliminary Domain Classification

**⚠️ NOTE:** This is preliminary extraction from API data. Final taxonomy assignment happens in Step 3.0.

**Domain Values:** fiction, non-fiction, poetry, drama

**Detection Logic (from API categories):**
- **fiction:** Novels, stories, fantasy, sci-fi, romance, mystery, etc.
- **non-fiction:** Biography, history, science, self-help, how-to, memoir, essays
- **poetry:** Poetry collections, verse
- **drama:** Plays, screenplays

**Hybrid Cases:**
- Memoir/Autobiography: non-fiction
- Historical Fiction: fiction
- Narrative Non-fiction: non-fiction
- Graphic Novels: fiction (unless biographical)

**Use API categories/genres and book description to guide this preliminary classification.**

**Final Assignment:** Domain will be formally assigned in Step 3.0 as the first taxonomy tag.

---

## 🏷️ PART 3: TAXONOMY TAGGING

### Reference Files Required
- `bookshelves_complete_taxonomy.json` (all valid slugs)
- `BOOKSHELVES_TAXONOMY_REFERENCE.md` (human-readable guide)

### Important: Taxonomy Assignment Order

**ALWAYS assign taxonomy in this order:**
1. **Domain** (fiction/non-fiction/poetry/drama) - Highest level
2. **Supergenres** (1-2) - Broad groupings
3. **Genres** (1-3) - Primary categories
4. **Subgenres** (1-5) - Specific niches
5. **Cross-tags** (10-20) - Multi-dimensional descriptors

This order ensures logical consistency (e.g., can't assign mystery genre before confirming it's fiction).

### Step 3.0: Assign Domain (REQUIRED: 1)

**Every book MUST have exactly ONE domain.**

**Domain Options:**
- `fiction` - Novels, stories, imaginative narratives
- `non-fiction` - Factual works, biographies, histories, guides
- `poetry` - Poetry collections, verse
- `drama` - Plays, screenplays

**Insert into:** `book_domains (book_id, domain_slug)`

**Example:**
```sql
INSERT INTO book_domains (book_id, domain_slug) VALUES ('book-1', 'fiction');
```

### Step 3.1: Assign Supergenres (REQUIRED: 1-2)

**Supergenres group related genres into broad categories.**

**Every book MUST have at least ONE supergenre. Assign this BEFORE genres.**

**Process:**
1. Based on preliminary domain classification (Step 2.4)
2. Based on API categories and your understanding of the book
3. Assign 1-2 supergenres that will guide genre selection

**Common Supergenres:**
- `speculative-fiction` - Fantasy, sci-fi, supernatural
- `mystery-thriller` - Mystery, thriller, suspense, crime
- `romance` - Romance, contemporary romance, romantic suspense
- `history-social-sciences` - History, biography, memoir, sociology
- `religion-spirituality` - Religious texts, spirituality, theology
- `business-economics` - Business, finance, economics
- `arts-entertainment` - Art, music, film, photography
- `science-technology` - Science, technology, computers
- `health-wellness` - Health, fitness, self-help

**Validation:** Every supergenre slug MUST exist in the taxonomy JSON.

**Insert into:** `book_supergenres (book_id, supergenre_slug)`

**Example:**
```sql
INSERT INTO book_supergenres (book_id, supergenre_slug) VALUES 
  ('book-1', 'mystery-thriller'),
  ('book-1', 'history-social-sciences');
```

### Step 3.2: Assign Genres (REQUIRED: 1-3)

**Every book MUST have at least ONE genre.**

**Process:**
1. Check book's existing `categories[]` field
2. Map to our 101 standardized genres
3. Add 1-3 most relevant genres

**Genre Slug Examples:**
- fiction, literary-fiction, mystery, thriller, romance, fantasy, science-fiction, historical-fiction, horror, paranormal, urban-fantasy, contemporary-fiction
- non-fiction, biography, memoir, history, true-crime, self-help, business, psychology, science, philosophy
- christianity, islam, judaism, buddhism, hinduism (religion genres)
- reference, pets-animals, religious-fiction

**Validation:** Every genre slug MUST exist in the taxonomy JSON.

### Step 3.3: Assign Subgenres (RECOMMENDED: 1-5)

**Each subgenre belongs to a parent genre.** Only assign subgenres that match one of the book's genres.

**Process:**
1. For each assigned genre, look up available subgenres
2. Select 1-5 that best describe the book's niche
3. Validate: subgenre's `genre_slug` MUST match an assigned genre

**Example:**
- Genre: `fantasy` → Subgenres: `epic-fantasy`, `magic-school`, `dragons`
- Genre: `mystery` → Subgenres: `cozy-mystery`, `detective`, `police-procedural`
- Genre: `christianity` → Subgenres: `christian-devotional`, `bible-studies`

**If Unsure:** Be conservative. Better to assign fewer accurate subgenres than guess incorrectly.

### Step 3.4: Assign Cross-Tags (REQUIRED: 10-20)

**Cross-tags are the richest metadata layer.** These multi-dimensional tags cover themes, tropes, tone, setting, characters, plot devices, representation, and content warnings.

**Tag Groups Available (12 total):**
- **trope** (1,226 tags): Narrative patterns (chosen-one, enemies-to-lovers, time-travel)
- **representation** (305 tags): Identity, diversity (lgbtq, bipoc, disability-rep)
- **plot** (284 tags): Story structures (murder-mystery, heist, quest)
- **tone** (195 tags): Mood (dark, humorous, inspirational, gritty)
- **content_warning** (190 tags): Sensitive content (violence, abuse, death, trauma)
- **style** (139 tags): Writing techniques (first-person, multiple-pov, unreliable-narrator)
- **setting** (65 tags): Time/place (victorian-era, small-town, space-opera, post-apocalyptic)
- **market** (55 tags): Audience/positioning (bestseller, debut-novel, book-club-pick)
- **tone_mood** (55 tags): Emotional atmosphere variants
- **structure** (41 tags): Narrative form (epistolary, novella, anthology)
- **tropes_themes** (106 tags): Thematic elements
- **content_flags** (72 tags): Additional descriptors

**Tagging Strategy:**

1. **Read Your Rewritten Summary** - Extract obvious tags from the text you wrote
2. **Cover Multiple Dimensions** - Don't focus only on tropes or only tone
3. **Aim for 10-20 tags minimum** - More is better (improves discoverability)
4. **Balance specificity** - Mix broad (dark, mystery-elements) with specific (serial-killer, victorian-london)

**Tag Selection Examples:**

**Book:** "A detective hunts a serial killer in 1890s London fog"
- Genres: mystery, historical-fiction
- Cross-tags:
  - Plot: murder-mystery, serial-killer, detective, investigation
  - Setting: victorian-era, london, historical-1800s, foggy-atmosphere
  - Tone: dark, suspenseful, grim
  - Character: detective-protagonist, complex-villain
  - Trope: cat-and-mouse, race-against-time

**Book:** "Teen girl discovers she's the chosen one with magical powers"
- Genres: fantasy, young-adult
- Cross-tags:
  - Trope: chosen-one, coming-of-age, hidden-powers, magic-school
  - Character: female-protagonist, teen-protagonist, reluctant-hero
  - Plot: quest, training-arc, good-vs-evil
  - Setting: magical-world, contemporary-fantasy
  - Tone: hopeful, adventurous
  - Audience: YA (via audience field)

**Content Warnings:**
If the book contains sensitive material (violence, sexual content, abuse, trauma, death, etc.), ALWAYS include appropriate content_warning tags:
- violence, graphic-violence, death, murder
- sexual-content, explicit-sex, rape, sexual-assault
- abuse, child-abuse, domestic-violence
- mental-health, depression, suicide, self-harm
- addiction, substance-abuse
- trauma, ptsd, war-trauma

**Validation:** Every tag slug MUST exist in the cross_tags taxonomy.

### Step 3.5: Assign Format (IF KNOWN)

**Format indicates the physical or digital format of the book edition.**

**Format Values:** hardcover, paperback, ebook, audiobook, mass-market-paperback

**Assignment Logic:**
1. Use preliminary format detection from Step 2.2
2. Only assign if confident (don't guess)
3. Skip if format is unclear from API data

**Insert into:** `book_formats (book_id, format_slug)`

**Example:**
```sql
INSERT INTO book_formats (book_id, format_slug) VALUES ('book-123', 'hardcover');
```

### Step 3.6: Assign Audience/Age Market (IF KNOWN)

**Audience indicates the target age range for the book.**

**Audience Values:** adult, young-adult, middle-grade, children

**Assignment Logic:**
1. Use preliminary audience detection from Step 2.3
2. Refine based on summary content and genre
3. Default to `adult` if unclear for general fiction/non-fiction
4. Skip if truly uncertain (children's books)

**Insert into:** `book_age_markets (book_id, age_market_slug)`

**Example:**
```sql
INSERT INTO book_age_markets (book_id, age_market_slug) VALUES ('book-123', 'young-adult');
```

---

## ✅ PART 4: QUALITY VALIDATION

Before finalizing each book, run these checks:

### Validation Checklist

- [ ] **Authors Present:** At least one author assigned (REQUIRED)
- [ ] **Summary Present:** `description` field is not empty
- [ ] **Summary Length:** 150-300 words (~200 target)
- [ ] **Summary Originality:** No copied phrases >3-4 words from sources
- [ ] **No Spoilers:** Summary only covers setup/first act, no endings
- [ ] **No Marketing Language:** Removed all "#1 bestseller", "Don't miss", promotional quotes
- [ ] **Domain Count:** Exactly 1 domain assigned (fiction/non-fiction/poetry/drama)
- [ ] **Supergenre Count:** At least 1 supergenre assigned
- [ ] **Genre Count:** At least 1 genre assigned, max 3
- [ ] **Cross-Tag Count:** At least 10 cross-tags assigned (target 10-20)
- [ ] **Tag Validity:** ALL tags exist in taxonomy reference
- [ ] **Subgenre-Genre Match:** All subgenres' parent genres are in book's genres
- [ ] **Taxonomy Order:** Domain assigned before supergenres, supergenres before genres
- [ ] **Published Date Format:** Valid YYYY or YYYY-MM-DD format (if present)
- [ ] **Page Count Format:** Integer value (if present)
- [ ] **Format/Audience Assignment:** Correctly assigned to separate tables (if known)

**If ANY check fails:**
1. Log the issue in batch report
2. Fix the issue (rewrite summary, add more tags, correct format, etc.)
3. Re-validate before proceeding

**Do NOT proceed with SQL generation until all validations pass.**

---

## 💾 PART 5: SQL MIGRATION GENERATION

### Output File Structure

**Filename:** `migration_batch_<N>.sql` (e.g., `migration_batch_001.sql`)

**Header:**
```sql
-- Batch N: Books <start_id> to <end_id>
-- Generated: 2025-10-23 15:30:00
-- Books Processed: 100
-- Agent: GPT Metadata Enrichment

BEGIN;
```

### Step 5.1: Cleanup (Idempotent DELETE)

**CRITICAL:** Delete existing taxonomy links for this batch FIRST to make script re-runnable.

```sql
-- Clear existing taxonomy links for books in this batch
DELETE FROM book_genres WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
DELETE FROM book_subgenres WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
DELETE FROM book_cross_tags WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
DELETE FROM book_supergenres WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
DELETE FROM book_age_markets WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
DELETE FROM book_formats WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
DELETE FROM book_domains WHERE book_id IN ('book-1', 'book-2', ..., 'book-100');
```

### Step 5.2: UPDATE Books Table

```sql
-- Update book-1: "Example Title" by Author Name
UPDATE books
SET 
  authors = '["Author Name"]',
  description = 'Your rewritten summary text here...',
  published_date = '2011-05-15',
  page_count = 342,
  publisher = 'Publisher Name',
  language = 'en'
WHERE id = 'book-1';
```

**Notes:**
- Only UPDATE fields you have valid data for
- ALWAYS update authors (REQUIRED - JSON array format)
- ALWAYS update description with rewritten summary
- Leave other fields unchanged if no new data available

### Step 5.3: INSERT Taxonomy Links

**Group by book for readability:**

```sql
-- Taxonomy for book-1 ("Example Title")

-- Domain (FIRST)
INSERT INTO book_domains (book_id, domain_slug) VALUES
  ('book-1', 'fiction');

-- Supergenres (SECOND)
INSERT INTO book_supergenres (book_id, supergenre_slug) VALUES
  ('book-1', 'mystery-thriller'),
  ('book-1', 'history-social-sciences');

-- Genres (THIRD)
INSERT INTO book_genres (book_id, genre_slug) VALUES
  ('book-1', 'mystery'),
  ('book-1', 'historical-fiction');

-- Subgenres (FOURTH)
INSERT INTO book_subgenres (book_id, subgenre_slug) VALUES
  ('book-1', 'victorian-mystery'),
  ('book-1', 'detective');

-- Cross-tags (showing 15+ tags)
INSERT INTO book_cross_tags (book_id, cross_tag_slug) VALUES
  ('book-1', 'murder-mystery'),
  ('book-1', 'serial-killer'),
  ('book-1', 'detective-protagonist'),
  ('book-1', 'victorian-era'),
  ('book-1', 'london'),
  ('book-1', 'foggy-atmosphere'),
  ('book-1', 'dark'),
  ('book-1', 'suspenseful'),
  ('book-1', 'cat-and-mouse'),
  ('book-1', 'investigation'),
  ('book-1', 'complex-villain'),
  ('book-1', 'historical-1800s'),
  ('book-1', 'grim'),
  ('book-1', 'violence'),
  ('book-1', 'death');

-- Audience
INSERT INTO book_age_markets (book_id, age_market_slug) VALUES
  ('book-1', 'adult');

-- Format
INSERT INTO book_formats (book_id, format_slug) VALUES
  ('book-1', 'hardcover');
```

**Repeat for each book in batch.**

### Step 5.4: Commit Transaction

```sql
COMMIT;

-- End of Batch N
```

---

## 📊 PART 6: PROGRESS TRACKING & LOGGING

### Progress Log File: `enrichment_progress.json`

**Location:** Same directory as migration files

**Structure:**
```json
{
  "last_batch_number": 3,
  "total_books_processed": 300,
  "last_book_id": "book-300",
  "next_offset": 300,
  "last_run_timestamp": "2025-10-23T15:45:00Z",
  "session_history": [
    {
      "batch_number": 1,
      "books_processed": 100,
      "timestamp": "2025-10-23T14:00:00Z",
      "sql_file": "migration_batch_001.sql",
      "status": "completed"
    },
    {
      "batch_number": 2,
      "books_processed": 100,
      "timestamp": "2025-10-23T14:35:00Z",
      "sql_file": "migration_batch_002.sql",
      "status": "completed"
    },
    {
      "batch_number": 3,
      "books_processed": 100,
      "timestamp": "2025-10-23T15:15:00Z",
      "sql_file": "migration_batch_003.sql",
      "status": "completed"
    }
  ],
  "statistics": {
    "avg_tags_per_book": 14.2,
    "summaries_rewritten": 300,
    "summaries_generated_from_scratch": 12,
    "books_with_missing_authors": 0,
    "books_with_missing_dates": 45,
    "books_with_missing_page_counts": 78
  }
}
```

**Update After Each Batch:**
1. Increment `last_batch_number`
2. Add `books_processed` to `total_books_processed`
3. Update `last_book_id` and `next_offset`
4. Add new entry to `session_history`
5. Update `statistics`

### Batch Report File: `batch_<N>_report.md`

**Location:** Same directory as migration files

**Structure:**
```markdown
# Batch N Enrichment Report

**Date:** 2025-10-23 15:45:00
**Books Processed:** 100
**Status:** Completed
**SQL File:** migration_batch_003.sql

## Summary Statistics

- Total summaries rewritten: 98
- Summaries generated from scratch: 2
- Average summary length: 203 words
- Average tags per book: 14.5

## Field Coverage

| Field | Populated | Missing |
|-------|-----------|---------|
| authors | 100 | 0 |
| description | 100 | 0 |
| published_date | 87 | 13 |
| page_count | 92 | 8 |
| publisher | 95 | 5 |
| format | 78 | 22 |
| audience | 100 | 0 |

## Taxonomy Coverage

- Domains: 100 books (1 per book - required)
- Supergenres: 100 books (avg 1.3 per book)
- Genres: 100 books (avg 1.4 per book)
- Subgenres: 100 books (avg 2.1 per book)
- Cross-tags: 100 books (avg 14.5 per book)

## Issues Encountered

- 13 books missing published_date (APIs returned null)
- 8 books missing page_count
- 22 books: format could not be determined
- 2 books: No API descriptions available, generated from internal knowledge

## Books Needing Manual Review

None

## Next Steps

Continue with Batch 4 (books 301-400)
```

---

## 🎯 PART 7: SESSION EXECUTION GUIDE

### Starting a New Session

1. **Load Progress Log:**
   ```
   Read enrichment_progress.json
   If file doesn't exist:
     - Start at batch 1, offset 0
     - Create new progress.json
   Else:
     - Resume at next_offset
     - Increment batch number
   ```

2. **Query Database for Batch:**
   ```sql
   SELECT * FROM books 
   ORDER BY id 
   LIMIT 100 OFFSET <next_offset>;
   ```

3. **Initialize Session Variables:**
   - Batch number
   - Start time
   - Books to process (IDs)
   - API cache (empty dictionary)

### During Processing

**For Each Book:**

1. **Fetch External Data** (cache results, including authors)
2. **Extract Authors** (REQUIRED - validate at least one)
3. **Process Summary** (mandatory rewrite)
4. **Extract Metadata** (all fields)
5. **Apply Taxonomy** (all categories in correct order)
6. **Validate** (run checklist)
7. **Generate SQL Statements** (accumulate in memory)

**Time Management:**
- Check elapsed time every 10 books
- If approaching 35 minutes, save progress and exit gracefully
- Better to process 80 books completely than 100 incompletely

### Ending a Session

1. **Write SQL Migration File** (`migration_batch_<N>.sql`)
2. **Write Batch Report** (`batch_<N>_report.md`)
3. **Update Progress Log** (`enrichment_progress.json`)
4. **Output Summary to Console:**
   ```
   ✅ Batch 3 Complete
   📊 100 books enriched
   💾 Files: migration_batch_003.sql, batch_003_report.md
   ⏭️  Next: Start at offset 300 (Batch 4)
   ```

---

## 🚨 CRITICAL REMINDERS

### Required Fields

**EVERY book MUST have:**
- ✅ **Authors** - At least one author (JSON array format)
- ✅ **Summary** - Original rewritten description (150-300 words)
- ✅ **Domain** - Exactly one domain tag (fiction/non-fiction/poetry/drama)
- ✅ **Supergenre** - At least one supergenre tag
- ✅ **Genre** - At least one genre tag
- ✅ **Cross-tags** - At least 10 cross-tags (target 15-20)

**Do NOT proceed to SQL generation if any required field is missing.**

### Copyright Compliance

**NEVER COPY TEXT FROM:**
- ❌ Google Books descriptions
- ❌ Amazon product pages
- ❌ Goodreads summaries
- ❌ Publisher websites
- ❌ OpenLibrary (may contain copied text)

**ALWAYS:**
- ✅ Rewrite EVERY external summary in your own words
- ✅ Set aside source text while writing
- ✅ Verify no copied phrases >3-4 words remain
- ✅ Use sources only to understand facts, not as writing templates

### Data Quality Standards

**Every Book Must Have:**
- At least 1 author (REQUIRED)
- Original summary (150-300 words)
- Exactly 1 domain (fiction/non-fiction/poetry/drama)
- At least 1 supergenre
- At least 1 genre
- At least 10 cross-tags (target 15-20)

**Best Effort Fields** (populate if available):
- published_date
- page_count
- publisher
- format
- audience

### Batch Integrity

- Each batch is **idempotent** (DELETE before INSERT)
- Each batch is **independent** (can be applied separately)
- Progress is **resumable** (sessions can be interrupted)
- SQL is **transactional** (BEGIN/COMMIT wrapping)

---

## 📚 REFERENCE MATERIALS

### Required Files

1. **Taxonomy Reference:**
   - `BOOKSHELVES_TAXONOMY_REFERENCE.md` (human-readable)
   - `bookshelves_complete_taxonomy.json` (machine-readable, 3,368 items)

2. **Schema Documentation:**
   - Books table structure
   - Taxonomy link table structures (book_genres, book_cross_tags, etc.)

3. **Progress Tracking:**
   - `enrichment_progress.json` (session state)
   - `batch_<N>_report.md` (per-batch reports)
   - `migration_batch_<N>.sql` (SQL output)

### API Documentation

- **Google Books API:** https://developers.google.com/books/docs/v1/using
- **OpenLibrary API:** https://openlibrary.org/dev/docs/api/books

### Legal Guidelines

- **Copyright on Product Descriptions:** Protect original expression, rewrite mandatory
- **Fair Use:** Using facts from summaries is fine, copying expression is not
- **Public Domain:** Only pre-1928 texts are safely public domain in US
- **Open Licenses:** Verify CC0 or CC-BY explicitly before reusing text

---

## ✨ SUCCESS CRITERIA

**A batch is successful when:**

1. ✅ All books have original, rewritten summaries
2. ✅ All books have complete taxonomy assignments (genres, subgenres, supergenres, cross-tags)
3. ✅ All metadata fields are populated where available
4. ✅ All SQL statements are valid and idempotent
5. ✅ Progress log is updated correctly
6. ✅ Batch report is generated
7. ✅ No copyright violations (verified through originality checks)

**Quality Benchmarks:**
- 100% books have at least 1 author (REQUIRED)
- 90%+ books have 150-300 word summaries
- 100% books have exactly 1 domain (REQUIRED)
- 100% books have at least 1 supergenre (REQUIRED)
- 100% books have at least 1 genre (REQUIRED)
- 100% books have at least 10 cross-tags (REQUIRED)
- 80%+ books have published_date
- 75%+ books have page_count
- 0% books have copied text from sources

---

## 🔄 CONTINUOUS IMPROVEMENT

After each batch, review the report for:
- Books with missing critical fields
- Low tag counts (increase to 15-20)
- Summary quality issues (too short, spoilers, marketing language)
- API failures (adjust retry logic)

Use insights to improve subsequent batches.

---

**Version History:**
- v2.1 (2025-10-23): Added batch prioritization, fixed taxonomy order (Domain→Supergenres→Genres→Subgenres), added author validation, split Format/Audience sections
- v2.0 (2025-10-23): Comprehensive restructure with progress tracking, complete field coverage, and copyright compliance
- v1.0 (2025-10-22): Initial metadata enrichment plan

**Agent Contact:** This guide is for GPT-4 autonomous execution. For human review, see Warp Agent (infrastructure).

