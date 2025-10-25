# GPT Task: Generate Cross-Tag Pattern Definitions

## 🎯 Core Directive

**Your task**: Create a comprehensive `cross_tag_patterns.json` file with pattern-matching definitions for cross-tags used in the Bookshelves book metadata enrichment system.

**CRITICAL**: Your final output MUST be a **downloadable JSON file** that can be directly imported into the codebase. DO NOT provide a summary or explanation document. The JSON file is the deliverable.

---

## 📚 Required Reference Documents

You MUST read and understand these documents before proceeding. Each document is provided with both a filename and direct GitHub URL for access:

### 1. Complete Taxonomy (Primary Reference)
**File**: `bookshelves_complete_taxonomy.json`  
**URL**: https://github.com/Crake77/Bookshelves/blob/main/bookshelves_complete_taxonomy.json

This contains ALL cross-tags in the system organized by group. You will create pattern definitions for these tags.

### 2. Database Schema
**File**: `DATABASE_SCHEMA_REFERENCE.md`  
**URL**: https://github.com/Crake77/Bookshelves/blob/main/DATABASE_SCHEMA_REFERENCE.md

Shows how cross-tags are stored in PostgreSQL and their relationships to books.

### 3. Legal Data Strategy
**File**: `LEGAL_DATA_STRATEGY.md`  
**URL**: https://github.com/Crake77/Bookshelves/blob/main/LEGAL_DATA_STRATEGY.md

**IMPORTANT**: Explains legal constraints on data usage. All pattern definitions must respect:
- CC0 license requirements for Open Library data
- No copyrighted material in pattern definitions
- Attribution requirements

### 4. Cross-Tag System Design (Your Implementation Plan)
**File**: `CROSS_TAG_SYSTEM_DESIGN.md`  
**URL**: https://github.com/Crake77/Bookshelves/blob/main/CROSS_TAG_SYSTEM_DESIGN.md

Contains the detailed design for the pattern matching system you're implementing, including:
- Multi-layer matching approach
- False positive prevention strategies
- Example pattern structures

### 5. Workflow Fixes Documentation
**File**: `WORKFLOW_FIXES_COMPLETED.md`  
**URL**: https://github.com/Crake77/Bookshelves/blob/main/WORKFLOW_FIXES_COMPLETED.md

Provides context on why this task is needed and how it fits into the larger enrichment pipeline.

---

## ❗ The Problem We're Solving

### Current Issue
The enrichment system has **rich data** from AI-written summaries and Open Library subjects but is **failing to detect cross-tags** effectively:

**Example**:
- Book: "When I'm Gone" (contemporary romance)
- AI Summary: 1712 characters including phrases like:
  - "class differences"
  - "family estrangement"  
  - "second chances"
  - "Texas ranch"
  - "celebrity family"
- **Current detection**: Only 3 tags found (ranch, painful, personal)
- **Should detect**: 10-20 tags including class-differences, family-drama, second-chances, workplace-romance, etc.

### Root Cause
Tags use hyphenated slugs (`second-chances`) but summaries use natural language ("second chances" or "fresh start"). Simple regex matching fails because:
1. Exact hyphenated matches are rare in natural text
2. Splitting by hyphens creates false positives ("missing-persons" → matches any "persons")
3. No synonym/concept matching (can't find "redemption" when tag is "second-chances")

### Your Solution
Create pattern definitions that map natural language phrases to taxonomy slugs using:
- **Exact phrases**: literal matches with flexibility for spaces/hyphens
- **Synonyms**: conceptually equivalent terms
- **Avoid patterns**: phrases that disqualify a match (prevent false positives)

---

## 📋 Task Specifications

### Output Format

Create a JSON file with this exact structure:

```json
{
  "version": "1.0",
  "generated_date": "2025-10-24",
  "total_tags": 150,
  "coverage_notes": "Focused on top 150 most common fiction/romance/fantasy/thriller tags",
  "patterns": {
    "second-chances": {
      "exact": ["second chance", "second chances", "another chance"],
      "synonyms": ["redemption", "fresh start", "new beginning", "do-over", "start over"],
      "phrases": ["rebuilding after", "opportunity to redo", "making amends"],
      "avoid": ["no second chance", "never gave a second chance"],
      "confidence_boost": 0.1,
      "notes": "Common romance/drama trope"
    },
    "class-differences": {
      "exact": ["class differences", "class divide", "social class", "different social standing"],
      "synonyms": ["wealth gap", "rich and poor", "different worlds", "wrong side of tracks"],
      "phrases": ["from different backgrounds", "social barriers", "economic disparity"],
      "avoid": ["cooking class", "class schedule", "class reunion"],
      "confidence_boost": 0.1,
      "notes": "Romance/drama theme"
    },
    "missing-persons": {
      "exact": ["missing person", "missing persons", "disappeared", "gone missing"],
      "synonyms": ["vanished", "abducted", "kidnapped"],
      "phrases": ["search for", "looking for someone who", "trying to find"],
      "avoid": ["persons employed", "qualified persons", "all persons must"],
      "confidence_boost": 0.0,
      "notes": "Mystery/thriller content warning - requires complete phrase match"
    }
  }
}
```

### Priority Tags to Include

Focus on these high-value groups (aim for 150-200 total tags):

**1. Romance Tropes (30-40 tags)**:
- second-chances, enemies-to-lovers, friends-to-lovers, forbidden-love, fake-relationship, forced-proximity, marriage-of-convenience, childhood-friends, love-triangle, slow-burn, workplace-romance, age-gap, opposites-attract, etc.

**2. Common Themes (30-40 tags)**:
- family-drama, coming-of-age, identity, belonging, grief, redemption, revenge, betrayal, sacrifice, loyalty, survival, justice, freedom, power, corruption, etc.

**3. Settings (20-30 tags)**:
- small-town, big-city, rural, urban, coastal, mountain, island, desert, ranch, farm, school, college, hospital, military, prison, etc.

**4. Content Warnings (20-30 tags)**:
- violence, sexual-content, death, abuse, mental-health, suicide, self-harm, addiction, eating-disorder, grief, trauma, war, gore, etc.

**5. Character Types (15-20 tags)**:
- strong-female-lead, reluctant-hero, anti-hero, found-family, chosen-one, mentor-figure, ensemble-cast, unreliable-narrator, etc.

**6. Tone/Mood (15-20 tags)**:
- dark, light, humorous, serious, hopeful, bleak, uplifting, emotional, suspenseful, tense, mysterious, atmospheric, etc.

**7. Fantasy/Sci-Fi Specific (20-30 tags)**:
- magic-system, dragons, elves, vampires, werewolves, fae, portal, time-travel, space-opera, dystopian, post-apocalyptic, cyberpunk, etc.

### Pattern Definition Guidelines

For each tag, provide:

1. **Exact phrases** (3-5): Literal ways the concept appears in text
   - Include singular and plural forms
   - Include common variations ("second chance" and "another chance")
   
2. **Synonyms** (5-10): Equivalent terms readers/writers actually use
   - Think like a book reviewer or Goodreads reader
   - Include casual language ("fresh start" for "new beginning")
   
3. **Phrases** (3-7): Partial matches that strongly indicate the tag
   - Use when full concept is expressed differently
   - Example: "rebuilding their relationship" → second-chances
   
4. **Avoid patterns** (2-5): Phrases that disqualify a match
   - Prevent false positives
   - Example: "cooking class" should NOT match class-differences
   
5. **Confidence boost** (0.0-0.2): How much to increase match confidence
   - 0.2 for unambiguous tags (second-chances)
   - 0.1 for common tags
   - 0.0 for potentially ambiguous tags (missing-persons)

6. **Notes**: Brief explanation of tag usage/context

### Quality Requirements

- **Precision over recall**: Better to miss some matches than create false positives
- **Natural language**: Use phrases actual readers/reviewers use
- **Comprehensive coverage**: Each tag should have 10-20 total matching patterns
- **Context-aware**: Consider how terms are used in book descriptions vs. other contexts
- **Genre-specific**: Romance patterns differ from thriller patterns

---

## 🚫 Common Pitfalls to Avoid

1. **Don't split compound tags**: "missing-persons" must match as a phrase, not "missing" OR "persons"
2. **Don't use single words**: "betrayal" alone is too broad, need "betrayal of trust", "betrayed by"
3. **Don't ignore negations**: "no second chance" should NOT match second-chances tag
4. **Don't copy taxonomy names verbatim**: The tag is "chosen-one" but text says "prophecy" or "destined hero"
5. **Don't create circular definitions**: Synonyms should be different words, not just the slug de-hyphenated

---

## 🎯 Success Criteria

Your pattern definitions will be considered successful if:

1. **Coverage**: 150-200 of the most common tags have definitions
2. **Completeness**: Each tag has 10-20 total patterns (exact + synonyms + phrases)
3. **Precision**: Avoid patterns reduce false positive risk
4. **Usability**: Patterns use natural language book reviewers actually use
5. **Format**: Valid JSON that can be directly imported
6. **Testing**: When applied to "When I'm Gone" romance novel, should detect 10-15 tags instead of current 3

---

## 📤 Deliverable Format

**Provide a downloadable file**: `cross_tag_patterns.json`

**DO NOT**:
- Provide a summary document
- Explain your methodology
- Give examples of usage
- Create a research report

**DO**:
- Generate the complete JSON file
- Ensure it's valid JSON (test with a validator)
- Include all required fields
- Make it immediately usable in the codebase

---

## 🤔 Discretion Granted

You have discretion on:
- Which 150-200 tags to prioritize (focus on most common in popular fiction)
- Specific synonyms and phrases to include
- How many patterns per tag (10-20 range)
- Confidence boost values (0.0-0.2 range)
- Whether to include additional helpful metadata fields

You do NOT have discretion on:
- Output format (must be JSON, not explanation)
- Required fields (exact, synonyms, phrases, avoid)
- Quality over quantity (precision matters more than coverage)
- Legal constraints (must respect CC0 licensing per LEGAL_DATA_STRATEGY.md)

---

## 🔗 Quick Reference URLs

All documents in one place for easy access:

1. **Taxonomy**: https://github.com/Crake77/Bookshelves/blob/main/bookshelves_complete_taxonomy.json
2. **Database Schema**: https://github.com/Crake77/Bookshelves/blob/main/DATABASE_SCHEMA_REFERENCE.md
3. **Legal Strategy**: https://github.com/Crake77/Bookshelves/blob/main/LEGAL_DATA_STRATEGY.md
4. **System Design**: https://github.com/Crake77/Bookshelves/blob/main/CROSS_TAG_SYSTEM_DESIGN.md
5. **Workflow Context**: https://github.com/Crake77/Bookshelves/blob/main/WORKFLOW_FIXES_COMPLETED.md

---

## ✅ Final Checklist Before Submission

- [ ] I have read all 5 reference documents
- [ ] I understand the false positive prevention requirements
- [ ] I have created patterns for 150-200 tags
- [ ] Each tag has 10-20 total matching patterns
- [ ] I included "avoid" patterns for ambiguous tags
- [ ] The output is valid JSON (tested with validator)
- [ ] The file is downloadable (not a summary/explanation)
- [ ] I followed legal constraints from LEGAL_DATA_STRATEGY.md
- [ ] Pattern language matches how real readers describe books

---

**Ready to begin!** Download the reference documents, analyze the taxonomy, and generate the `cross_tag_patterns.json` file.
