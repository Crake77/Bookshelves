# Batch 002 Enrichment Fix Plan

**Date:** 2025-11-04  
**Status:** Ready for Next Session  
**Priority:** HIGH

---

## Assessment Summary

### ✅ Patterns DO Exist (Confirmed)
- **Format patterns**: `light-novel`, `webtoon`, `web-novel`, `audiobook` all exist in `format_patterns.json`
- **Cross-tag patterns**: Most patterns exist in `cross_tag_patterns_v1.json`:
  - ✅ `heaven` (line 59)
  - ✅ `cultivation` (line 827)
  - ✅ `prophecy` (line 2789)
  - ✅ `abuse` (line 9278)
  - ✅ `chosen-one` (line 10977)
  - ✅ `litrpg` (line 11402)

### ❌ Missing Patterns (Need to Add)
- ❌ `female-protagonist` - Pattern exists as `strong-female-lead` but slug mismatch! (CRITICAL)
- ❌ `male-protagonist` - NOT in patterns file
- ❌ `juvenile-violence` - NOT in patterns file
- ❌ `magic` - NOT in patterns file (generic magic element)
- ❌ `slavery` - NOT in patterns file

### ✅ Taxonomy Tags Exist (Confirmed)
All tags exist in database:
- ✅ `female-protagonist` (taxonomy line 25912)
- ✅ `male-protagonist` (taxonomy line 26199)
- ✅ `chosen-one` (taxonomy line 25639)
- ✅ `prophecy` (taxonomy line 26402)
- ✅ `abuse` (taxonomy line 4856)
- ✅ `slavery` (taxonomy line 6424)

### 🔍 Root Causes Identified

#### 1. Pattern Matching Logic Issues

**Problem:** Task-06 uses TWO methods:
- **Method 1**: Direct slug/name matching (lines 78-162) - only matches if slug/name appears verbatim
- **Method 2**: Pattern-based matching (lines 181-216) - only called if < 20 tags found (line 168)

**Why It Failed:**
- `suggestCrossTags()` prioritizes direct matching over pattern matching
- Pattern matching only fills gaps if direct matching finds < 20 tags
- Direct matching requires exact phrase: "chosen one" won't match "Dragon Reborn" even though it's a chosen-one story
- Patterns like `chosen-one` have phrases like "special destiny" but may not match vague descriptions

**Fix Required:**
- Merge pattern matching results with direct matching (not just fill gaps)
- Lower pattern match thresholds
- Add semantic inference for protagonist types (gender detection from names/pronouns)

#### 2. Subgenre Detection - Too Literal

**Problem:** Task-05 `suggestSubgenres()` only matches exact subgenre names/slugs in title/description

**Why It Failed:**
- "The Eye of the World" doesn't contain "epic fantasy" phrase
- "Ender's Game" doesn't contain "space opera" phrase
- "Dune" doesn't contain "space opera" phrase
- Needs semantic inference (keywords like "galactic", "interstellar", "prophecy", "epic journey")

**Fix Required:**
- Create `subgenre_patterns.json` similar to `format_patterns.json`
- Add weighted scoring for semantic indicators
- OR enhance task-05 with keyword-based inference

#### 3. Format Detection - Thresholds Too High

**Problem:** Format patterns exist but may not match due to:
- High confidence thresholds (0.65-0.70)
- Missing title patterns (e.g., "Part 1 Volume 1" for light-novels)
- No support for multiple formats

**Fix Required:**
- Review format pattern thresholds
- Add more title patterns for light-novel detection
- Support multiple formats (novel + audiobook)

#### 4. Audience Detection - Single Value Only

**Problem:** Task-07 returns single audience slug, not array

**Fix Required:**
- Modify `detectAudience()` to return array or `includes` field
- Update `apply-to-db.ts` to handle multiple audiences

#### 5. Genre Detection - Single Genre Only

**Problem:** Task-05 assigns only one genre, not multiple

**Fix Required:**
- Allow multiple genres when category signals indicate hybrid
- Add dual-genre detection (sci-fi + fantasy)

---

## Fix Implementation Plan

### Phase 1: Add Character Trait Detection System (HIGH PRIORITY)

**Root Cause:** Task-06 has NO semantic inference for character traits. It only does literal string matching:
- Requires exact phrase like "female protagonist" or "male protagonist" in text
- No logic to detect protagonist gender from pronouns ("he", "she", "his", "her")
- No logic to detect protagonist gender from character names
- No logic to infer character types from narrative descriptions

**Systemic Fix Required:**

**1. Add Protagonist Gender Detection Logic**
- Create `detectProtagonistGender()` function that:
  - Scans description/summary for pronouns referring to protagonist
  - Checks for common male/female name patterns
  - Analyzes sentence structure: "he is", "she discovers", "his journey", "her quest"
  - Assigns `female-protagonist` or `male-protagonist` tag based on inference
- This should be a **core detection method**, not just pattern matching

**2. Add Character Type Inference**
- Detect character archetypes from narrative context:
  - "chosen one" → "prophesied to", "destiny", "fulfill prophecy", "the one who will"
  - "anti-hero" → "morally gray", "questionable methods", "ends justify means"
  - "mentor" → "guides", "teaches", "wise old", "experienced"
- Use semantic indicators, not just exact phrases

**3. Fix Content Warning Detection**
- Current system requires exact phrase "slavery" but descriptions use:
  - "enslaved", "forced servitude", "bondage", "captivity", "chains"
- Current system requires exact phrase "juvenile violence" but descriptions use:
  - "child soldiers", "children fighting", "young protagonists in combat", "teenagers at war"
- **Fix:** Expand pattern matching to include semantic variations, not just synonyms list
- OR: Add content warning inference layer that detects from context

**4. Fix Pattern Matching Integration**
- **Current:** Pattern matching only fills gaps (line 168: `if (tags.length < 20)`)
- **Problem:** Direct matching (literal) runs first, pattern matching only supplements
- **Fix:** Merge pattern results with direct matches, prioritize by relevance score
- Pattern matching should be **primary method**, not gap-filler

**Files to Modify:**
- `enrichment-tasks/task-06-cross-tags.js` - Add semantic inference functions
- `cross_tag_patterns_v1.json` - Fix slug mismatches (e.g., `strong-female-lead` → `female-protagonist`)

### Phase 2: Enhance Subgenre Detection (HIGH PRIORITY)

**Option A:** Create `subgenre_patterns.json`
- Similar structure to `format_patterns.json`
- Add semantic indicators for:
  - `epic-fantasy`: "epic journey", "prophecy", "destiny", "ancient evil", "multiple POV"
  - `space-opera`: "galactic", "interstellar", "space battles", "alien species", "galaxy-spanning"
  - `isekai`: "reincarnated", "transported", "another world", "reborn"
  - `cultivation`: "qi", "cultivation", "martial arts", "breakthrough", "realm"
  - `post-apocalyptic`: "apocalypse", "after the fall", "collapsed world", "survival"

**Option B:** Enhance task-05 with keyword inference
- Add keyword lists for each subgenre
- Score based on keyword matches in description
- Lower threshold for subgenre assignment

### Phase 3: Fix Format Detection (MEDIUM PRIORITY)

**File:** `format_patterns.json`

1. **light-novel pattern:**
   - Add title pattern: `"Part \\d+ Volume \\d+"`
   - Lower threshold to 0.60
   - Add publisher: "J-Novel Club", "Seven Seas", "Yen Press"

2. **webtoon pattern:**
   - Add title pattern: `"Volume One"` (for Tower of God)
   - Add publisher: "WEBTOON", "Tapas", "Lezhin"

3. **web-novel pattern:**
   - Ensure pattern exists (check line 896)
   - Add signals: "Royal Road", "web novel", "originally published online"

4. **Multiple formats:**
   - Modify task-07 to support array of formats
   - Add `also_available_as` field

### Phase 4: Fix Audience Detection (MEDIUM PRIORITY)

**File:** `enrichment-tasks/task-07-format-audience.js`

1. Modify `detectAudience()` to return:
```javascript
{
  slug: 'adult', // primary
  includes: ['new-adult', 'young-adult'], // secondary
  confidence: 'high'
}
```

2. Update `apply-to-db.ts` to handle `includes` array

### Phase 5: Fix Genre Detection (MEDIUM PRIORITY)

**File:** `enrichment-tasks/task-05-genres-subgenres.js`

1. Allow multiple genres when:
   - Categories include both "science fiction" and "fantasy"
   - Title/keywords indicate hybrid genre
   - Description suggests dual classification

2. Add hybrid genre detection logic

### Phase 6: Enhance Pattern Matching with Semantic Understanding (HIGH PRIORITY)

**File:** `enrichment-tasks/task-06-cross-tags.js`

**Root Cause Analysis:**
1. **Pattern matching is secondary** - Only called if direct matching finds < 20 tags (line 168)
2. **Pattern matching still requires exact phrases** - `scorePattern()` function (line 218) only matches exact phrases, synonyms, or phrases from pattern file
3. **No semantic inference layer** - System doesn't understand meaning, only matches words

**Systemic Fixes:**

1. **Make pattern matching primary, not secondary:**
   - Merge pattern results with direct matches from the start
   - Combine scores from both methods
   - Prioritize by relevance, not method

2. **Add semantic inference layer:**
   - **Character traits:** Detect protagonist gender/type from narrative context, not just explicit phrases
   - **Content warnings:** Detect from semantic indicators (e.g., "forced servitude" → slavery)
   - **Tropes:** Infer from narrative patterns (e.g., prophecy mentions → chosen-one)

3. **Enhance pattern matching algorithm:**
   - Current: Requires exact phrase match in `exact`, `synonyms`, or `phrases` arrays
   - Enhanced: Add semantic similarity scoring (e.g., "enslaved" semantically similar to "slavery")
   - OR: Expand pattern phrases to include more semantic variations

4. **Fix pattern slug mismatches:**
   - Pattern `strong-female-lead` exists but taxonomy has `female-protagonist`
   - Either rename pattern OR create slug mapping/alias system

---

## Immediate Actions for Next Session

### Step 1: Analyze Why Character Traits Weren't Detected
- [ ] Review task-06 logic: Does it have ANY character trait inference?
- [ ] Check if patterns exist for protagonist types but aren't matching
- [ ] Identify if slug mismatches are preventing matches
- [ ] Determine: Do we need semantic inference or just fix pattern matching?

### Step 2: Analyze Why Content Warnings Weren't Flagged
- [ ] Test: Search descriptions for "slavery", "enslaved", "forced servitude" - do patterns exist?
- [ ] Test: Search for "juvenile violence", "child soldiers" - do patterns exist?
- [ ] Determine: Are patterns too specific? Do they need more phrase variations?
- [ ] Check: Is content warning detection a separate system or part of cross-tags?

### Step 2: Test Pattern Matching
- [ ] Run task-06 on one Batch 002 book with verbose logging
- [ ] Verify pattern matching is being called
- [ ] Check why patterns aren't matching (thresholds too high? patterns too specific?)

### Step 3: Analyze Why Subgenres Weren't Detected
- [ ] Test subgenre detection: Why didn't "epic fantasy" match "The Eye of the World"?
- [ ] Review: Does task-05 have any semantic indicators or only literal matching?
- [ ] Determine: Do we need subgenre patterns or enhance existing logic?

### Step 4: Create Subgenre Patterns (if needed)
- [ ] Create `subgenre_patterns.json` with semantic indicators
- [ ] Update task-05 to use pattern-based detection
- [ ] Test on Batch 002 books

### Step 4: Fix Format Detection
- [ ] Review format pattern thresholds
- [ ] Add missing title patterns
- [ ] Test light-novel, webtoon, web-novel detection

### Step 5: Enhance Audience/Genre Detection
- [ ] Modify task-07 for multiple audiences
- [ ] Modify task-05 for multiple genres
- [ ] Update apply-to-db.ts to handle arrays

### Step 6: Re-run Enrichment
- [ ] Re-run tasks 5, 6, 7 for Batch 002
- [ ] Verify all issues are fixed
- [ ] Re-apply to database

---

## Files to Modify

1. **`cross_tag_patterns_v1.json`** - Add missing patterns
2. **`enrichment-tasks/task-05-genres-subgenres.js`** - Add subgenre pattern matching
3. **`enrichment-tasks/task-06-cross-tags.js`** - Fix pattern integration
4. **`enrichment-tasks/task-07-format-audience.js`** - Support multiple audiences
5. **`format_patterns.json`** - Enhance light-novel, webtoon patterns
6. **`subgenre_patterns.json`** - CREATE NEW FILE
7. **`scripts/enrichment/apply-to-db.ts`** - Handle multiple audiences/formats

---

## Testing Checklist

After fixes, test on Batch 002 books:
- [ ] The Eye of the World: `epic-fantasy` subgenre, `chosen-one`, `prophecy`, `magic` tags, `new-adult` audience
- [ ] Ender's Game: `space-opera` subgenre, `male-protagonist`, `juvenile-violence` tags
- [ ] Speaker for the Dead: `space-opera` subgenre, `male-protagonist` tags
- [ ] Ascendance of a Bookworm: `light-novel` format, `isekai` subgenre, `female-protagonist`, `magic` tags, `young-adult` + `new-adult` audiences
- [ ] Tower of God: `webtoon` format, both `science-fiction` + `fantasy` genres
- [ ] Defiance of the Fall: `cultivation` + `apocalypse` subgenres, both `fantasy` + `science-fiction` genres, `litrpg`, `cultivation`, `apocalypse` tags, `new-adult` audience, both `novel` + `audiobook` formats
- [ ] Path of the Deathless: `web-novel` format, `litrpg`, `post-apocalyptic` tags
- [ ] The Great Hunt: Remove `dragons` tag, add `heaven`, `abuse`, `slavery` tags
- [ ] Dune: `space-opera` subgenre, `new-adult` audience

---

## Notes

- Patterns exist but may not be matching due to:
  1. Pattern matching only fills gaps (not merged with direct matching)
  2. Thresholds too high
  3. Patterns too specific (need more phrase variations)
  4. Missing semantic inference

- Subgenres need pattern-based detection (not just literal matching)

- Some fixes require taxonomy expansion (e.g., `juvenile-violence` if it doesn't exist)

