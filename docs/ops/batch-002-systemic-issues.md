# Batch 002 - Systemic Issues Analysis

**Date:** 2025-11-04  
**Focus:** Understand WHY categories were missed, not just fix specific tags

---

## Core Question: Why Weren't These Detected?

### 1. Character Traits (Protagonist Gender/Type)

**What Was Missed:**
- Female/male protagonist tags
- Character archetypes (chosen-one, anti-hero, etc.)

**Why It Was Missed - Root Causes:**

#### A. No Semantic Inference
**Current System:**
- Task-06 only does literal string matching
- Requires exact phrase: "female protagonist" or "male protagonist"
- No logic to infer from pronouns ("he", "she", "his", "her")
- No logic to infer from character names or narrative context

**Example:**
- "Rand al'Thor" is clearly a male protagonist, but system doesn't detect this
- "Myne" is clearly a female protagonist, but system doesn't detect this
- Description says "he journeys" but system doesn't infer "male-protagonist"

**Fix Needed:**
- Add semantic inference layer for character traits
- Detect protagonist gender from pronouns, names, narrative voice
- Make character trait detection a **core feature**, not dependent on explicit phrases

#### B. Pattern Matching Issues
- Pattern `strong-female-lead` exists but taxonomy slug is `female-protagonist` - mismatch prevents matching
- Pattern matching only fills gaps (< 20 tags), not primary method
- Patterns may not cover all phrasing variations

---

### 2. Content Warnings (Slavery, Abuse, Violence)

**What Was Missed:**
- Slavery tags (despite "enslaved", "forced servitude" in descriptions)
- Abuse tags
- Juvenile violence tags

**Why It Was Missed - Root Causes:**

#### A. Overly Literal Matching
**Current System:**
- Requires exact phrase "slavery" in text
- Doesn't match semantic equivalents: "enslaved", "forced servitude", "bondage"
- Pattern matching may have these in `phrases` array, but if pattern doesn't exist or doesn't match, it's missed

**Example:**
- Description: "characters are enslaved" → Should flag `slavery` tag
- Description: "child soldiers fight" → Should flag `juvenile-violence` tag
- But system requires exact phrase match

**Fix Needed:**
- Expand content warning detection to use semantic indicators
- Add inference layer: "enslaved" → slavery, "forced servitude" → slavery
- OR: Ensure patterns have comprehensive phrase variations

#### B. Pattern Coverage Gaps
- Patterns may exist but not cover all semantic variations
- Pattern matching may not be triggered if direct matching finds other tags first
- Content warnings may need dedicated detection system (not just cross-tags)

---

### 3. Subgenres (Epic Fantasy, Space Opera, etc.)

**What Was Missed:**
- Epic fantasy for "The Eye of the World"
- Space opera for "Ender's Game", "Speaker for the Dead", "Dune"
- Isekai for "Ascendance of a Bookworm"
- Cultivation for "Defiance of the Fall"

**Why It Was Missed - Root Causes:**

#### A. Literal Matching Only
**Current System (Task-05):**
- `suggestSubgenres()` only matches exact subgenre names/slugs
- Requires literal phrase: "epic fantasy" or "space opera" in title/description
- No semantic inference: "galactic war" doesn't trigger "space-opera"
- No keyword-based detection: "prophecy" + "destiny" doesn't trigger "epic-fantasy"

**Example:**
- "The Eye of the World" → Has "prophecy", "destiny", "epic journey" but no literal "epic fantasy" phrase
- "Ender's Game" → Has "interstellar", "alien", "space" but no literal "space opera" phrase
- "Ascendance of a Bookworm" → Has "reborn", "another world" but no literal "isekai" phrase

**Fix Needed:**
- Create semantic pattern-based subgenre detection
- Similar to format detection (weighted scoring from indicators)
- Use keyword lists and semantic indicators, not just exact phrases

---

### 4. Formats (Light Novel, Webtoon, Web Novel)

**What Was Missed:**
- Light novel for "Ascendance of a Bookworm: Part 1 Volume 1"
- Webtoon for "Tower of God Volume One"
- Web novel for "Path of the Deathless"

**Why It Was Missed - Root Causes:**

#### A. Pattern Thresholds Too High
**Current System:**
- Format patterns exist in `format_patterns.json`
- Uses weighted scoring (exact phrase, title pattern, publisher, description markers)
- Requires minimum confidence (0.65-0.70)
- May not match edge cases like "Part 1 Volume 1" structure

**Example:**
- "Ascendance of a Bookworm: Part 1 Volume 1" → May not trigger light-novel pattern
  - Title pattern may not include "Part X Volume Y" format
  - Publisher may not be in pattern's publisher list
  - Score may not reach threshold

**Fix Needed:**
- Review format pattern thresholds
- Add more title patterns (e.g., "Part X Volume Y" for light-novels)
- Lower thresholds for edge cases
- Add more publisher signals

---

### 5. Multiple Values (Audiences, Genres, Formats)

**What Was Missed:**
- Multiple audiences (adult + new-adult + young-adult)
- Multiple genres (science-fiction + fantasy)
- Multiple formats (novel + audiobook)

**Why It Was Missed - Root Causes:**

#### A. Single-Value Architecture
**Current System:**
- Task-07 `detectAudience()` returns single slug: `{ slug: 'adult' }`
- Task-05 `suggestGenres()` returns array but logic may stop after first match
- Task-07 `detectFormat()` returns single format

**Fix Needed:**
- Modify to support arrays or `includes` fields
- Add logic to detect crossover appeal (e.g., new-adult = young-adult + adult crossover)
- Support multiple formats when book is available in multiple formats

---

## Systemic Improvements Needed

### 1. Add Semantic Inference Layer
- **Character traits:** Detect from narrative context, not just explicit phrases
- **Content warnings:** Detect from semantic indicators, not just exact words
- **Tropes:** Infer from narrative patterns, not just keyword matching

### 2. Make Pattern Matching Primary
- Currently: Pattern matching is gap-filler (< 20 tags)
- Change: Pattern matching should be primary method, direct matching supplements
- Merge results from both methods, prioritize by relevance

### 3. Create Subgenre Pattern System
- Currently: Literal matching only
- Change: Pattern-based detection with semantic indicators (like format detection)

### 4. Support Multiple Values
- Currently: Single audience, genre, format
- Change: Arrays or `includes` fields for crossover classifications

### 5. Fix Pattern Integration Issues
- Slug mismatches (pattern name vs taxonomy slug)
- Pattern matching thresholds
- Pattern coverage gaps

---

## Next Session Priorities

1. **Investigate semantic inference** - Can we add character trait detection from pronouns/names?
2. **Fix pattern integration** - Make pattern matching primary, fix slug mismatches
3. **Create subgenre patterns** - Add semantic indicator-based detection
4. **Enhance content warning detection** - Add semantic inference for warnings
5. **Support multiple values** - Add arrays/includes for audiences, genres, formats

