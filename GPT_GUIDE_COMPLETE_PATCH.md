# Complete Patch for GPT_METADATA_ENRICHMENT_GUIDE.md

## Instructions
Apply these changes in the order listed below. Each section shows the FIND text and the REPLACE text.

---

## PATCH 1: Add authors to Books Table Fields (Line ~380)

**FIND:**
```markdown
|| Field | Source Priority | Notes |
||-------|----------------|-------|
|| **description** | REWRITTEN SUMMARY | Your original text only |
|| **published_date** | 1) Google publishedDate<br>2) OpenLibrary publish_date<br>3) Leave null if unknown | Format: YYYY-MM-DD or YYYY |
```

**REPLACE:**
```markdown
|| Field | Source Priority | Notes |
||-------|----------------|-------|
|| **authors** | 1) Google volumeInfo.authors[]<br>2) OpenLibrary author_name[] | JSON array of strings (REQUIRED) |
|| **description** | REWRITTEN SUMMARY | Your original text only |
|| **published_date** | 1) Google publishedDate<br>2) OpenLibrary publish_date<br>3) Leave null if unknown | Format: YYYY-MM-DD or YYYY |
```

---

## PATCH 2: Clarify Step 2.3 is Preliminary (Line ~409)

**FIND:**
```markdown
### Step 2.3: Determine Audience/Age Market

**Audience Values:** adult, young-adult, middle-grade, children

**Detection Rules:**
```

**REPLACE:**
```markdown
### Step 2.3: Extract Preliminary Audience/Age Market

**⚠️ NOTE:** This is preliminary extraction from API data. Final taxonomy assignment happens in Step 3.6.

**Audience Values:** adult, young-adult, middle-grade, children

**Detection Rules (from API categories/metadata):**
```

---

## PATCH 3: Add note after Step 2.3 (Line ~427)

**FIND:**
```markdown
**If Unclear:** Default to `adult` for fiction/non-fiction, or leave blank if truly uncertain.

### Step 2.4: Determine Domain (REQUIRED: Assign FIRST)
```

**REPLACE:**
```markdown
**If Unclear:** Default to `adult` for fiction/non-fiction, or leave blank if truly uncertain.

**This preliminary detection will be finalized in Step 3.6 during taxonomy assignment.**

### Step 2.4: Extract Preliminary Domain Classification

**⚠️ NOTE:** This is preliminary extraction from API data. Final taxonomy assignment happens in Step 3.0.
```

---

## PATCH 4: Update Step 2.4 description (Line ~433)

**FIND:**
```markdown
**Domain Values:** fiction, non-fiction, poetry, drama

**⚠️ IMPORTANT:** Domain is a taxonomy assignment, not just a metadata field. It goes in the `book_domains` table alongside genres and cross-tags.

**Detection Logic:**
```

**REPLACE:**
```markdown
**Domain Values:** fiction, non-fiction, poetry, drama

**Detection Logic (from API categories):**
```

---

## PATCH 5: Remove redundant text from Step 2.4 (Line ~449)

**FIND:**
```markdown
**Use API categories/genres and book description to guide this decision.**

**Assignment Priority:** Domain should be assigned BEFORE genres and supergenres, as it's the highest-level classification.
```

**REPLACE:**
```markdown
**Use API categories/genres and book description to guide this preliminary classification.**

**Final Assignment:** Domain will be formally assigned in Step 3.0 as the first taxonomy tag.
```

---

## PATCH 6: CRITICAL - Reorder Taxonomy Sections

This is the biggest change. The current Step 3.1 (Genres) needs to move AFTER a new Step 3.1 (Supergenres).

### Current Structure (WRONG):
- Step 3.0: Domain
- Step 3.1: Genres ← WRONG ORDER
- Step 3.2: Subgenres
- Step 3.3: Supergenres ← THIS SHOULD BE STEP 3.1!
- Step 3.4: Cross-tags
- Step 3.5: Format/Audience (needs splitting)

### Target Structure (CORRECT):
- Step 3.0: Domain  
- Step 3.1: Supergenres ← MOVED UP
- Step 3.2: Genres ← MOVED DOWN
- Step 3.3: Subgenres (stays same)
- Step 3.4: Cross-tags (stays same)
- Step 3.5: Format
- Step 3.6: Audience

**ACTION REQUIRED:** 

1. Copy the entire "Step 3.3: Assign Supergenres" section
2. Delete it from its current location
3. Insert it as "Step 3.1: Assign Supergenres" RIGHT AFTER Step 3.0
4. Rename current "Step 3.1: Assign Genres" to "Step 3.2: Assign Genres"
5. Rename current "Step 3.2: Assign Subgenres" to "Step 3.3: Assign Subgenres"
6. Current Step 3.4 stays as Step 3.4

**New Step 3.1 Content:**
```markdown
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
\`\`\`sql
INSERT INTO book_supergenres (book_id, supergenre_slug) VALUES 
  ('book-1', 'mystery-thriller'),
  ('book-1', 'history-social-sciences');
\`\`\`
```

---

## PATCH 7: Split Step 3.5 into 3.5 (Format) and 3.6 (Audience)

**FIND (current Step 3.5):**
```markdown
### Step 3.5: Split Format and Audience into Separate Assignments

**IMPORTANT:** Format and Audience are NOT the same concept. Handle them separately:

**Format Assignment (book_formats table):**
- Use slug: hardcover, paperback, ebook, audiobook, mass-market-paperback
- Based on physical/digital format detection
- Insert into: `book_formats (book_id, format_slug)`

**Audience Assignment (book_age_markets table):**
- Use slug: adult, young-adult, middle-grade, children
- Based on target age range
- Insert into: `book_age_markets (book_id, age_market_slug)`

**Example SQL Inserts:**
\`\`\`sql
-- Format
INSERT INTO book_formats (book_id, format_slug) VALUES ('book-123', 'hardcover');

-- Audience
INSERT INTO book_age_markets (book_id, age_market_slug) VALUES ('book-123', 'young-adult');
\`\`\`
```

**REPLACE WITH TWO SECTIONS:**

```markdown
### Step 3.5: Assign Format (IF KNOWN)

**Format indicates the physical or digital format of the book edition.**

**Format Values:** hardcover, paperback, ebook, audiobook, mass-market-paperback

**Assignment Logic:**
1. Use preliminary format detection from Step 2.2
2. Only assign if confident (don't guess)
3. Skip if format is unclear from API data

**Insert into:** `book_formats (book_id, format_slug)`

**Example:**
\`\`\`sql
INSERT INTO book_formats (book_id, format_slug) VALUES ('book-123', 'hardcover');
\`\`\`

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
\`\`\`sql
INSERT INTO book_age_markets (book_id, age_market_slug) VALUES ('book-123', 'young-adult');
\`\`\`
```

---

## PATCH 8: Update PART 4 Validation Checklist (Line ~616)

**FIND:**
```markdown
### Validation Checklist

- [ ] **Summary Present:** `description` field is not empty
- [ ] **Summary Length:** 150-300 words (~200 target)
- [ ] **Summary Originality:** No copied phrases >3-4 words from sources
- [ ] **No Spoilers:** Summary only covers setup/first act, no endings
- [ ] **No Marketing Language:** Removed all "#1 bestseller", "Don't miss", promotional quotes
- [ ] **Genre Count:** At least 1 genre assigned, max 3
- [ ] **Supergenre Count:** At least 1 supergenre assigned
- [ ] **Cross-Tag Count:** At least 10 cross-tags assigned (target 10-20)
- [ ] **Tag Validity:** ALL tags exist in taxonomy reference
- [ ] **Subgenre-Genre Match:** All subgenres' parent genres are in book's genres
- [ ] **Published Date Format:** Valid YYYY or YYYY-MM-DD format (if present)
- [ ] **Page Count Format:** Integer value (if present)
- [ ] **Format/Audience Split:** Correctly assigned to separate tables
```

**REPLACE:**
```markdown
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
```

---

## PATCH 9: Update SQL Example Order (Step 5.3, Line ~690)

**FIND:**
```sql
-- Taxonomy for book-1 ("Example Title")

-- Genres
INSERT INTO book_genres (book_id, genre_slug) VALUES
  ('book-1', 'mystery'),
  ('book-1', 'historical-fiction');

-- Subgenres
INSERT INTO book_subgenres (book_id, subgenre_slug) VALUES
  ('book-1', 'victorian-mystery'),
  ('book-1', 'detective');

-- Supergenres
INSERT INTO book_supergenres (book_id, supergenre_slug) VALUES
  ('book-1', 'mystery-thriller'),
  ('book-1', 'historical');
```

**REPLACE:**
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
```

---

## PATCH 10: Move Domain INSERT in SQL example (Line ~730)

**FIND:**
```sql
-- Format
INSERT INTO book_formats (book_id, format_slug) VALUES
  ('book-1', 'hardcover');

-- Domain
INSERT INTO book_domains (book_id, domain_slug) VALUES
  ('book-1', 'fiction');
```

**REPLACE:**
```sql
-- Format
INSERT INTO book_formats (book_id, format_slug) VALUES
  ('book-1', 'hardcover');
```

(Domain INSERT already moved up in PATCH 9)

---

## PATCH 11: Update "Every Book Must Have" section (Line ~940)

**FIND:**
```markdown
**Every Book Must Have:**
- Original summary (150-300 words)
- At least 1 genre
- At least 1 supergenre
- At least 10 cross-tags (target 15-20)
- Domain assignment (fiction/non-fiction)
```

**REPLACE:**
```markdown
**Every Book Must Have:**
- At least 1 author (REQUIRED)
- Original summary (150-300 words)
- Exactly 1 domain (fiction/non-fiction/poetry/drama)
- At least 1 supergenre
- At least 1 genre
- At least 10 cross-tags (target 15-20)
```

---

## Summary of Changes

1. ✅ Added authors to Books Table Fields
2. ✅ Clarified Step 2.3 is preliminary extraction
3. ✅ Clarified Step 2.4 is preliminary extraction
4. ✅ **CRITICAL:** Reordered taxonomy sections (Supergenres before Genres)
5. ✅ Split Step 3.5 into 3.5 (Format) and 3.6 (Audience)
6. ✅ Added authors to validation checklist
7. ✅ Fixed validation order (Domain → Supergenres → Genres)
8. ✅ Updated SQL example to show correct taxonomy order
9. ✅ Updated "Every Book Must Have" section

## Testing After Patches Applied

1. Verify taxonomy order appears correctly throughout document
2. Check all step numbers are sequential (3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
3. Confirm validation checklist matches taxonomy order
4. Verify SQL examples show Domain → Supergenres → Genres → Subgenres → Cross-tags → Format → Audience

## Version Update

After applying all patches, update the version line at the top:
```markdown
**Version:** 2.1  
```

And add a changelog note at the bottom:
```markdown
**Version History:**
- v2.1 (2025-10-23): Added batch prioritization, fixed taxonomy order, added author validation
- v2.0 (2025-10-23): Comprehensive restructure with progress tracking and copyright compliance
- v1.0 (2025-10-22): Initial metadata enrichment plan
```
