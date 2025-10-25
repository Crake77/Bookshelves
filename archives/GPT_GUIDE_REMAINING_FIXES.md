# Remaining Fixes for GPT_METADATA_ENRICHMENT_GUIDE.md

## ✅ COMPLETED (Just Now)
1. ✅ Added PART 0: Batch Prioritization Strategy (comprehensive section with SQL queries)
2. ✅ Added authors to extraction list in Step 1.1
3. ✅ Added popularity signals to extraction list

## 🔧 STILL NEEDED

### 1. Add Authors to Books Table Fields (Step 2.1)
**Location:** Line ~214
**Change:** Add authors row to the metadata extraction table
```markdown
|| **authors** | 1) Google volumeInfo.authors[]<br>2) OpenLibrary author_name[] | JSON array of strings (REQUIRED) |
```

### 2. Fix Step 2.3 - Clarify Preliminary Audience Extraction
**Location:** Line ~243
**Change:** Add note that this is preliminary, final assignment in Step 3.6
```markdown
### Step 2.3: Extract Preliminary Audience/Age Market

**⚠️ NOTE:** This is preliminary extraction from API data. Final taxonomy assignment happens in Step 3.6.
```

### 3. Fix Step 2.4 - Clarify Preliminary Domain Extraction
**Location:** Line ~263
**Change:** Add note that this is preliminary, final assignment in Step 3.0
```markdown
### Step 2.4: Extract Preliminary Domain Classification

**⚠️ NOTE:** This is preliminary extraction from API data. Final taxonomy assignment happens in Step 3.0.
```

### 4. REORDER TAXONOMY SECTIONS - CRITICAL!
**Current Order (WRONG):**
- 3.0: Domain
- 3.1: Genres ❌
- 3.2: Subgenres  
- 3.3: Supergenres ❌ (this should be step 1 after domain!)
- 3.4: Cross-tags
- 3.5: Format/Audience split

**Correct Order:**
- 3.0: Domain (fiction/non-fiction/poetry/drama)
- 3.1: Supergenres (1-2 required) ← **MOVE THIS UP!**
- 3.2: Genres (1-3 required)
- 3.3: Subgenres (1-5 recommended)
- 3.4: Cross-tags (10-20 required)
- 3.5: Format (if known)
- 3.6: Audience (if known)

**Actions Required:**
- Move current Step 3.3 (Supergenres) to become Step 3.1
- Renumber Genres to 3.2
- Renumber Subgenres to 3.3
- Cross-tags stays 3.4
- Split Step 3.5 into 3.5 Format + 3.6 Audience

### 5. Split Step 3.5 into Two Separate Sections
**Current:** One section with "split" language  
**Needed:** Two distinct sections

**Step 3.5: Assign Format (IF KNOWN)**
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
```

**Step 3.6: Assign Audience/Age Market (IF KNOWN)**
```markdown
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

### 6. Update PART 4 Validation Checklist
**Location:** Line ~457
**Add:**
- [ ] **Authors Present:** At least one author assigned (REQUIRED)

**Fix order:**
- Domain should be checked BEFORE genres
- Supergenres should be checked BEFORE genres

**Current validation order is wrong:**
```
- Genre Count
- Supergenre Count  ← should be before genres!
```

**Correct validation order:**
```
- [ ] **Authors Present:** At least one author assigned (REQUIRED)
- [ ] **Domain Count:** Exactly 1 domain assigned
- [ ] **Supergenre Count:** At least 1 supergenre assigned
- [ ] **Genre Count:** At least 1 genre assigned, max 3
- [ ] **Taxonomy Order:** Domain → Supergenres → Genres → Subgenres verified
```

### 7. Update Workflow Diagram (Line ~62)
**Change:** Update step 4 to show correct order:
```
│ 4. Apply Taxonomy Tags (IN ORDER)      │
│    ├── Domain (1 required)             │
│    ├── Supergenres (1-2 required)      │  ← Already correct
│    ├── Genres (1-3 required)           │
```

### 8. Update SQL Generation Example (Step 5.3)
**Current order in example SQL:**
```sql
-- Genres
-- Subgenres
-- Supergenres  ← wrong order!
```

**Should be:**
```sql
-- Domain
-- Supergenres
-- Genres
-- Subgenres
-- Cross-tags
-- Format
-- Audience
```

## Priority Order for Fixes

1. **HIGHEST:** Fix taxonomy ordering (Steps 3.1-3.6 reordering)
2. **HIGH:** Split Format/Audience into separate sections
3. **HIGH:** Add authors to validation checklist
4. **MEDIUM:** Add authors to Step 2.1 table
5. **MEDIUM:** Clarify preliminary extraction notes (Steps 2.3, 2.4)
6. **LOW:** Update SQL example order (Step 5.3)

## Estimated Time
- Complete reordering of taxonomy sections: 30 minutes
- All other fixes: 15 minutes
- Total: 45 minutes of careful editing

## Files to Review After Fixes
- GPT_METADATA_ENRICHMENT_GUIDE.md (main file)
- DOCUMENTATION_INDEX.md (may need version bump)
