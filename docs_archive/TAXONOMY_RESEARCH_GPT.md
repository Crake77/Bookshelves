# GPT Research Task: Taxonomy Expansion

## 🎯 Mission

**Expand the quantity of taxonomy entries** to provide comprehensive coverage for book categorization.

**CRITICAL**: This is an **EXPANSION task**, NOT a restructure. Keep the existing schema, table structure, and naming conventions exactly as they are.

---

## 📋 Current State Analysis

### Existing Taxonomy Counts

| Table | Current Count | Status |
|-------|---------------|--------|
| `genres` | 93 | ✅ Good coverage |
| `subgenres` | 456 | ⚠️ Uneven distribution |
| `cross_tags` | 339 | ❌ NEEDS MAJOR EXPANSION |
| `domains` | 2 | ✅ Complete (fiction/nonfiction) |
| `supergenres` | 34 | ⚠️ Some have only 1 genre |
| `age_markets` | 7 | ✅ Sufficient |
| `formats` | 38 | ✅ Comprehensive |

### Problems Identified

1. **Sparse Subgenre Coverage**
   - Some genres have only 1-2 subgenres
   - Need minimum 5-10 subgenres per genre for granular categorization

2. **Insufficient Cross Tags**
   - Only 339 tags for 93 genres is extremely limited
   - Missing obvious tags like "lgbtq", "gay", "queer", etc. (manually added by user)
   - Need 20-50 tags per genre category
   - **Target: 2000-3000 total tags**

3. **Orphaned Supergenres**
   - Some supergenres have only 1 linked genre
   - Should have minimum 3-5 genres per supergenre

4. **Missing Granular Content Flags**
   - Need comprehensive content warning tags
   - Missing representation tags
   - Missing mood/tone tags

---

## 🔍 Research Objectives

### Primary Goal
**Expand taxonomy quantity by 3-5x** while maintaining existing structure and naming conventions.

### Specific Targets

#### 1. Cross Tags Expansion (Priority: CRITICAL)

**Current**: 339 tags  
**Target**: 2000-3000 tags  
**Expansion Factor**: 6-9x

**Required Tag Categories** (with group field):

**A. Thematic Tags** (`group = 'theme'`)
- Core themes (identity, survival, revenge, redemption, etc.)
- Social themes (class, race, immigration, justice, etc.)
- **Minimum 200 thematic tags**

**B. Character Tags** (`group = 'character'`)
- Protagonist types (female-protagonist, male-protagonist, ensemble-cast, etc.)
- Character traits (morally-grey, anti-hero, chosen-one, underdog, etc.)
- Relationships (found-family, enemies-to-lovers, mentor-student, etc.)
- **Minimum 300 character tags**

**C. Setting Tags** (`group = 'setting'`)
- Time periods (ancient, medieval, victorian, 1920s, contemporary, etc.)
- Locations (urban, rural, small-town, desert, arctic, space, etc.)
- World types (alternate-history, parallel-worlds, post-apocalyptic, etc.)
- **Minimum 250 setting tags**

**D. Plot Tags** (`group = 'plot'`)
- Structure (multiple-timelines, nonlinear, frame-narrative, etc.)
- Pacing (slow-burn, fast-paced, episodic, etc.)
- Complexity (intricate-plot, simple-plot, mystery-elements, etc.)
- **Minimum 200 plot tags**

**E. Tone/Mood Tags** (`group = 'tone'`)
- Atmosphere (dark, light, gritty, whimsical, melancholic, etc.)
- Emotional (heartwarming, emotional, tearjerker, uplifting, etc.)
- Humor (humorous, satirical, dark-comedy, absurdist, etc.)
- **Minimum 150 tone tags**

**F. Writing Style Tags** (`group = 'style'`)
- POV (first-person, third-person-limited, omniscient, epistolary, etc.)
- Narrative voice (lyrical, sparse, experimental, stream-of-consciousness, etc.)
- **Minimum 100 style tags**

**G. Content Warning Tags** (`group = 'content_warning'`)
- Violence (graphic-violence, war, torture, death, etc.)
- Sexual content (explicit-sex, sexual-violence, abuse, etc.)
- Mental health (depression, suicide, self-harm, ptsd, etc.)
- Substance use (drug-use, alcoholism, addiction, etc.)
- Trauma (child-abuse, domestic-violence, etc.)
- **Minimum 150 content warning tags**

**H. Representation Tags** (`group = 'representation'`)
- LGBTQ+ (lgbtq, gay, lesbian, bisexual, transgender, queer, nonbinary, ace, aromantic, etc.)
- POC representation (black-mc, latino-mc, asian-mc, indigenous-mc, etc.)
- Disability (disabled-mc, neurodivergent, mental-illness-rep, etc.)
- Religion (muslim-mc, jewish-mc, hindu-mc, atheist-mc, etc.)
- **Minimum 200 representation tags**

**I. Tropes Tags** (`group = 'trope'`)
- Romance (enemies-to-lovers, forbidden-love, love-triangle, slow-burn-romance, etc.)
- Fantasy (chosen-one, magic-school, prophecy, dragons, etc.)
- Mystery (locked-room, unreliable-narrator, whodunit, etc.)
- Horror (haunted-house, body-horror, psychological-horror, etc.)
- **Minimum 400 trope tags**

**J. Audience/Market Tags** (`group = 'market'`)
- Reading level (easy-read, challenging, literary, commercial, etc.)
- Popularity (bestseller, award-winner, cult-classic, hidden-gem, etc.)
- Length (novella, door-stopper, quick-read, epic, etc.)
- **Minimum 50 market tags**

---

#### 2. Subgenre Expansion (Priority: HIGH)

**Current**: 456 subgenres  
**Target**: 700-800 subgenres  
**Expansion Factor**: 1.5-2x

**Requirements**:
- Every genre must have **minimum 5-10 subgenres**
- Identify genres with <3 subgenres and expand them
- Focus on specificity within each genre

**Examples of Needed Subgenres**:

**Fantasy** (needs more):
- Add: Portal Fantasy, LitRPG, Cozy Fantasy, Fairytale Retelling, etc.

**Science Fiction** (needs more):
- Add: Climate Fiction, First Contact, AI Thriller, Space Exploration, etc.

**Romance** (needs MANY more):
- Add: Fake Dating, Second Chance, Office Romance, Small Town Romance, Holiday Romance, Sports Romance, Royal Romance, etc.

**Mystery/Thriller** (needs more):
- Add: Domestic Thriller, Tech Thriller, Conspiracy Thriller, Locked Room Mystery, etc.

**Non-Fiction** (severely lacking):
- Need to expand ALL non-fiction genres with proper subgenres
- History: Military History, Social History, Ancient History, etc.
- Science: Popular Science, Biology, Physics, Astronomy, etc.
- Self-Help: Productivity, Relationships, Mental Health, Finance, etc.

---

#### 3. Genre-Supergenre Linking (Priority: MEDIUM)

**Requirements**:
- Every supergenre must have **minimum 3 genres** linked
- Review current links and add missing associations
- Some genres may belong to multiple supergenres

**Current Orphans to Fix**:
- Check `TAXONOMY_REFERENCE.json` for supergenres with single genre
- Research which genres naturally fit each supergenre
- Add link entries

---

## 🗄️ Database Schema (EXACT STRUCTURE - DO NOT MODIFY)

### Taxonomy Tables

```sql
-- DO NOT MODIFY STRUCTURE
CREATE TABLE genres (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,  -- lowercase-with-hyphens
  name TEXT NOT NULL          -- Display Name
);

CREATE TABLE subgenres (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  genre_id UUID REFERENCES genres(id)  -- Parent genre
);

CREATE TABLE cross_tags (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL  -- MUST be one of: theme, character, setting, plot, tone, style, content_warning, representation, trope, market
);

-- Other taxonomy tables (less expansion needed)
CREATE TABLE supergenres (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE age_markets (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE domains (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE formats (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);
```

### Relationship Tables

```sql
-- Subgenre to Genre (one-to-one parent)
CREATE TABLE subgenre_genres (
  subgenre_slug TEXT REFERENCES subgenres(slug),
  genre_slug TEXT REFERENCES genres(slug),
  PRIMARY KEY (subgenre_slug, genre_slug)
);

-- Genre to Supergenre (many-to-many)
CREATE TABLE genre_supergenres (
  genre_slug TEXT REFERENCES genres(slug),
  supergenre_slug TEXT REFERENCES supergenres(slug),
  PRIMARY KEY (genre_slug, supergenre_slug)
);

-- Genre to Domain (many-to-many)
CREATE TABLE genre_domains (
  genre_slug TEXT REFERENCES genres(slug),
  domain_slug TEXT REFERENCES domains(slug),
  PRIMARY KEY (genre_slug, domain_slug)
);

-- Supergenre to Domain (many-to-many)
CREATE TABLE supergenre_domains (
  supergenre_slug TEXT REFERENCES supergenres(slug),
  domain_slug TEXT REFERENCES domains(slug),
  PRIMARY KEY (supergenre_slug, domain_slug)
);
```

---

## 📝 Output Requirements

### 1. Research Report: `TAXONOMY_EXPANSION_RESEARCH.md`

Document your findings:

```markdown
# Taxonomy Expansion Research Report

## Executive Summary
- Current state analysis
- Gaps identified
- Recommended additions
- Justification for each category

## Detailed Findings

### Cross Tags Analysis
- Current coverage by group
- Missing critical tags (list specific examples)
- Industry standards research
- Competitor analysis (Goodreads, StoryGraph, etc.)

### Subgenre Analysis
- Genres with insufficient subgenres
- Proposed new subgenres with definitions
- Market research for each addition

### Supergenre-Genre Mapping
- Current orphans identified
- Proposed new links with rationale

## References
- Sources consulted
- Industry taxonomies reviewed
- Subject matter expert input
```

### 2. SQL Migration File: `taxonomy_expansion.sql`

Generate complete SQL to insert new entries:

```sql
-- TAXONOMY EXPANSION
-- Generated: [date]
-- Total New Entries: [count]

BEGIN;

-- ============================================
-- CROSS TAGS EXPANSION
-- ============================================

-- Theme Tags (group = 'theme')
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'identity-crisis', 'Identity Crisis', 'theme'),
  (gen_random_uuid(), 'coming-of-age', 'Coming of Age', 'theme'),
  (gen_random_uuid(), 'class-struggle', 'Class Struggle', 'theme'),
  -- ... hundreds more

-- Character Tags (group = 'character')
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'morally-grey-mc', 'Morally Grey MC', 'character'),
  (gen_random_uuid(), 'ensemble-cast', 'Ensemble Cast', 'character'),
  -- ... hundreds more

-- Representation Tags (group = 'representation')
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'lgbtq', 'LGBTQ+', 'representation'),
  (gen_random_uuid(), 'gay-mc', 'Gay MC', 'representation'),
  (gen_random_uuid(), 'lesbian-mc', 'Lesbian MC', 'representation'),
  (gen_random_uuid(), 'bisexual-mc', 'Bisexual MC', 'representation'),
  (gen_random_uuid(), 'transgender-mc', 'Transgender MC', 'representation'),
  (gen_random_uuid(), 'queer', 'Queer', 'representation'),
  (gen_random_uuid(), 'nonbinary-mc', 'Nonbinary MC', 'representation'),
  (gen_random_uuid(), 'ace-mc', 'Asexual MC', 'representation'),
  (gen_random_uuid(), 'aromantic-mc', 'Aromantic MC', 'representation'),
  (gen_random_uuid(), 'black-mc', 'Black MC', 'representation'),
  (gen_random_uuid(), 'latino-mc', 'Latino/a/x MC', 'representation'),
  (gen_random_uuid(), 'asian-mc', 'Asian MC', 'representation'),
  (gen_random_uuid(), 'indigenous-mc', 'Indigenous MC', 'representation'),
  (gen_random_uuid(), 'disabled-mc', 'Disabled MC', 'representation'),
  (gen_random_uuid(), 'neurodivergent-mc', 'Neurodivergent MC', 'representation'),
  -- ... many more

-- Content Warning Tags (group = 'content_warning')
INSERT INTO cross_tags (id, slug, name, "group") VALUES
  (gen_random_uuid(), 'graphic-violence', 'Graphic Violence', 'content_warning'),
  (gen_random_uuid(), 'sexual-content', 'Sexual Content', 'content_warning'),
  (gen_random_uuid(), 'suicide', 'Suicide', 'content_warning'),
  (gen_random_uuid(), 'self-harm', 'Self Harm', 'content_warning'),
  (gen_random_uuid(), 'child-abuse', 'Child Abuse', 'content_warning'),
  (gen_random_uuid(), 'domestic-violence', 'Domestic Violence', 'content_warning'),
  -- ... many more

-- [Continue for all tag groups...]

-- ============================================
-- SUBGENRES EXPANSION
-- ============================================

-- Find existing genre IDs first (or reference by slug in subgenre_genres table)
INSERT INTO subgenres (id, slug, name, genre_id) VALUES
  (gen_random_uuid(), 'portal-fantasy', 'Portal Fantasy', (SELECT id FROM genres WHERE slug = 'fantasy')),
  (gen_random_uuid(), 'cozy-fantasy', 'Cozy Fantasy', (SELECT id FROM genres WHERE slug = 'fantasy')),
  (gen_random_uuid(), 'litrpg', 'LitRPG', (SELECT id FROM genres WHERE slug = 'fantasy')),
  -- ... hundreds more

-- ============================================
-- RELATIONSHIP UPDATES
-- ============================================

-- Add genre-supergenre links where missing
INSERT INTO genre_supergenres (genre_slug, supergenre_slug) VALUES
  ('mystery', 'crime-mystery'),
  ('detective-fiction', 'crime-mystery'),
  -- ... fill gaps

COMMIT;
```

### 3. Validation File: `taxonomy_expansion_validation.json`

Summary statistics for validation:

```json
{
  "expansion_summary": {
    "cross_tags": {
      "before": 339,
      "added": 1661,
      "after": 2000,
      "breakdown_by_group": {
        "theme": 200,
        "character": 300,
        "setting": 250,
        "plot": 200,
        "tone": 150,
        "style": 100,
        "content_warning": 150,
        "representation": 200,
        "trope": 400,
        "market": 50
      }
    },
    "subgenres": {
      "before": 456,
      "added": 244,
      "after": 700
    },
    "genre_supergenre_links": {
      "before": 93,
      "added": 45,
      "after": 138
    }
  },
  "quality_checks": {
    "all_slugs_valid": true,
    "no_duplicates": true,
    "all_groups_valid": true,
    "min_subgenres_per_genre": 5,
    "min_genres_per_supergenre": 3
  }
}
```

---

## 🔍 Research Methodology

### Sources to Consult

1. **Competitor Taxonomies**
   - Goodreads tags/shelves
   - StoryGraph tags
   - LibraryThing subjects
   - Amazon book categories

2. **Industry Standards**
   - BISAC (Book Industry Standards)
   - Library of Congress classifications
   - Dewey Decimal for non-fiction

3. **Community Input**
   - BookTok trends
   - r/books, r/fantasy, r/romancebooks discussions
   - Book blogger taxonomies

4. **Literary Databases**
   - ISFDB (Science Fiction Database)
   - Fantasy literature databases
   - Genre-specific resources

### Research Process

**For Each Expansion Category**:

1. **Identify gaps** in current taxonomy
2. **Research** industry standards and user expectations
3. **Propose** specific new entries with justification
4. **Validate** proposed entries against usage data
5. **Generate** SQL with proper naming conventions

---

## ✅ Quality Standards

### Slug Naming Rules

**MUST follow these rules exactly**:

- **Lowercase only**: `gay-mc` not `Gay-MC`
- **Hyphens for spaces**: `found-family` not `found_family` or `foundFamily`
- **No special characters**: Only `a-z`, `0-9`, and `-`
- **Be specific**: `lgbtq-romance` not just `lgbtq` if about romance subgenre
- **Avoid redundancy**: `fantasy-magic` not `fantasy-genre-magic`

### Name Display Rules

- **Title Case**: "Found Family" not "found family"
- **Proper spelling**: "LGBTQ+" not "lgbtq+"
- **Abbreviations**: Use standard forms (MC for main character, POV for point of view)

### Group Classification

**cross_tags MUST have one of these groups**:
- `theme`
- `character`
- `setting`
- `plot`
- `tone`
- `style`
- `content_warning`
- `representation`
- `trope`
- `market`

**No other group values are allowed.**

---

## 🚨 What NOT To Do

### ❌ Do NOT:

1. **Change existing entries** - Only add new ones
2. **Modify table structure** - Schema is fixed
3. **Remove any existing taxonomy** - Expansion only
4. **Create new groups** - Use the 10 defined groups for cross_tags
5. **Duplicate existing entries** - Check `TAXONOMY_REFERENCE.json` first
6. **Use inconsistent naming** - Follow slug rules exactly
7. **Add subjective quality tags** - "good", "bad", "overrated" not allowed
8. **Add meta tags** - "popular", "trending" go in market group only

### ✅ Do:

1. **Research thoroughly** before proposing additions
2. **Provide justification** for each new category
3. **Follow naming conventions** exactly
4. **Group logically** - put tags in correct groups
5. **Think granularly** - specific tags are better than broad ones
6. **Consider discoverability** - tags should help users find books
7. **Include representation** - modern readers expect diverse tagging
8. **Add content warnings** - readers need to know sensitive content

---

## 📊 Success Criteria

After expansion is complete:

- ✅ **2000+ cross_tags** (from 339)
- ✅ **700+ subgenres** (from 456)
- ✅ **Every genre has 5+ subgenres**
- ✅ **Every supergenre has 3+ genres**
- ✅ **All 10 tag groups well-represented**
- ✅ **Comprehensive LGBTQ+ representation tags**
- ✅ **Comprehensive POC representation tags**
- ✅ **Comprehensive content warning tags**
- ✅ **SQL is syntactically valid and tested**
- ✅ **No duplicate slugs across taxonomy**

---

## 🚀 Execution Plan

### Phase 1: Analysis (30 min)
1. Read `TAXONOMY_REFERENCE.json` completely
2. Identify all gaps and sparse categories
3. Document current state quantitatively
4. Output: Gap analysis report

### Phase 2: Research (1-2 hours)
1. Research each gap category
2. Compile list of proposed additions
3. Validate against industry standards
4. Output: Proposed additions with sources

### Phase 3: SQL Generation (1 hour)
1. Format all additions as SQL INSERT statements
2. Generate UUIDs for new entries
3. Ensure proper foreign key references
4. Output: `taxonomy_expansion.sql`

### Phase 4: Validation (30 min)
1. Check for duplicates
2. Verify slug formatting
3. Validate group classifications
4. Output: `taxonomy_expansion_validation.json`

### Phase 5: Documentation (30 min)
1. Write research report
2. Document methodology
3. Provide usage guidelines
4. Output: `TAXONOMY_EXPANSION_RESEARCH.md`

**Total Estimated Time**: 3-4 hours

---

## 📞 Getting Started

1. **Read reference files**:
   - `SCHEMA_REFERENCE.md` - Table name mappings
   - `TAXONOMY_REFERENCE.json` - Current taxonomy data
   - `BOOK_SAMPLE.json` - Example of book data

2. **Analyze gaps** using the counts provided above

3. **Begin research** starting with cross_tags (highest priority)

4. **Generate SQL** incrementally, testing as you go

5. **Validate** before finalizing

---

## 📚 Reference Files

All available in GitHub repo:
- `SCHEMA_REFERENCE.md` - Schema and aliases
- `TAXONOMY_REFERENCE.json` - Current taxonomy (969 entries)
- `BOOK_SAMPLE.json` - Sample books
- `GPT_TASK_READINESS.md` - Project status

---

**End of Research Task Document**
