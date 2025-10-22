# Bookshelves Taxonomy System

## Overview

The Bookshelves taxonomy is a comprehensive, hierarchical classification system for books that separates orthogonal concerns into distinct dimensions. This design enables powerful filtering, searching, and browsing capabilities while maintaining data integrity and flexibility.

## Design Principles

### 1. Hierarchical Organization
- **Domain** → **Supergenre** → **Genre** → **Subgenre**
- Each level provides increasing specificity
- Cross-references allow for multi-classification

### 2. Orthogonal Dimensions
The taxonomy separates different book characteristics into independent dimensions:
- **Content classification**: Domains → Supergenres → Genres → Subgenres
- **Physical structure**: Formats (novel, graphic novel, etc.)
- **Target audience**: Age Markets (middle grade, young adult, etc.)
- **Story elements**: Cross-tags (tropes, themes, settings, moods, content flags)

### 3. Flexibility & Extensibility
- Many-to-many relationships where appropriate
- Cross-attachment system for multi-genre works
- Alias system for search compatibility
- Future-proof structure for adding new categories

## Database Schema

### Core Taxonomy Tables

#### `domains`
Top-level binary classification for all books.
```sql
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,      -- "fiction", "nonfiction"  
  name TEXT NOT NULL,             -- "Fiction", "Nonfiction"
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: 2 domains (Fiction, Nonfiction)

#### `supergenres`  
Umbrella categories that group related genres together.
```sql
CREATE TABLE supergenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,      -- "speculative-fiction", "crime-mystery"
  name TEXT NOT NULL,             -- "Speculative Fiction", "Crime & Mystery" 
  description TEXT,               -- Brief explanation of scope
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: 34 supergenres spanning both fiction and nonfiction
- **Fiction**: speculative-fiction, crime-mystery, thriller-suspense, romance, historical-fiction, contemporary-realism, literary-experimental, adventure-action, war-military-fiction, western-frontier, family-domestic, humor-satire, inspirational-religious-fiction
- **Nonfiction**: biography-memoir, history, science-nature, technology-engineering, philosophy, religion-spirituality, social-science, politics-current-affairs, business-economics, health-psychology, self-help-personal-growth, true-crime, travel-adventure, essays-criticism, arts-entertainment, food-drink, sports-recreation, home-hobbies, reference-education, environment-nature, pets-animals

#### `genres`
Primary classification that users recognize and browse by.
```sql
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,      -- "fantasy", "mystery", "biography"
  name TEXT NOT NULL,             -- "Fantasy", "Mystery", "Biography"
  description TEXT,               -- Optional detailed description
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: 95 broad genres
- **Fiction examples**: fantasy, science-fiction, horror, mystery, thriller, romance, historical-fiction, contemporary-fiction, literary-fiction, action-adventure, war-fiction, western, family-drama
- **Nonfiction examples**: biography, memoir, history, philosophy, religion, social-science, politics, economics, business, self-help, health, true-crime, travel-writing, food-drink, sports, arts-entertainment

#### `subgenres`
Most specific classification providing fine-grained categorization.
```sql
CREATE TABLE subgenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id UUID NOT NULL REFERENCES genres(id),  -- Primary parent genre
  slug TEXT NOT NULL UNIQUE,      -- "epic-fantasy", "cozy-mystery"
  name TEXT NOT NULL,             -- "Epic Fantasy", "Cozy Mystery"
  description TEXT,               -- Brief description
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: 529 specific subgenres
- **Fantasy examples**: epic-fantasy, urban-fantasy, portal-fantasy, grimdark, dark-fantasy, cozy-fantasy, romantasy, historical-fantasy, sword-and-sorcery, cultivation-xianxia, progression-fantasy
- **Mystery examples**: cozy-mystery, police-procedural, hard-boiled-detective, noir-mystery, locked-room-mystery, amateur-detective, historical-mystery
- **Science Fiction examples**: hard-science-fiction, space-opera, cyberpunk, military-science-fiction, dystopian-sf, post-apocalyptic-sf, time-travel-sf, first-contact, generation-ship, biopunk, steampunk, cli-fi

### Format Classification

#### `formats`
Describes the structural/physical form of the work, independent of content.
```sql
CREATE TABLE formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,      -- "novel", "graphic-novel", "manga"
  name TEXT NOT NULL,             -- "Novel", "Graphic Novel", "Manga"
  description TEXT,               -- Form/structure description
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: 40 distinct formats
- **Prose**: novel, novella, novelette, short-story, short-story-collection, anthology
- **Visual**: graphic-novel, comic-book, manga, manhwa, manhua, webtoon, picture-book, illustrated-novel
- **Poetry**: poetry-collection, single-poem, chapbook
- **Scripts**: drama-play, screenplay
- **Digital**: web-serial, serial-novel, audiobook-original, podcast-serial, interactive-fiction, hypertext-novel
- **Collections**: omnibus, compendium, anthology
- **Specialized**: light-novel, board-book, art-book, zine

### Age Market Classification

#### `age_markets`
Defines target readership age ranges.
```sql
CREATE TABLE age_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,      -- "young-adult", "middle-grade"
  name TEXT NOT NULL,             -- "Young Adult", "Middle Grade"
  min_age INT,                    -- Minimum target age
  max_age INT,                    -- Maximum target age (NULL = no upper limit)
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: 7 age market segments
- **infant-toddler**: 0-3 years
- **early-readers**: 4-8 years  
- **middle-grade**: 8-12 years
- **young-adult**: 12-18 years
- **new-adult**: 18-25 years
- **adult**: 25+ years
- **general**: All ages

### Cross-Tag System

#### `cross_tags`
Orthogonal attributes that can apply across genres (tropes, themes, settings, moods, content flags).
```sql
CREATE TABLE cross_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "group" TEXT NOT NULL CHECK ("group" IN ('tropes_themes', 'setting', 'tone_mood', 'structure', 'content_flags')),
  slug TEXT NOT NULL UNIQUE,      -- "enemies-to-lovers", "small-town", "cozy"
  name TEXT NOT NULL,             -- "Enemies to Lovers", "Small Town", "Cozy"
  description TEXT,               -- Explanation of the tag
  enabled BOOLEAN DEFAULT TRUE
);
```

**Data**: ~300 cross-tags in 5 groups

**Group: tropes_themes** (~100 tags)
Story mechanisms and narrative themes: isekai, portal, time-loop, time-travel, chosen-one, enemies-to-lovers, found-family, redemption-arc, revenge, heist, prophecy, forbidden-love, arranged-marriage, secret-identity, etc.

**Group: setting** (~60 tags)  
Physical and temporal locations: secondary-world, small-town, big-city, regency-era, victorian-era, space, post-apocalyptic, cyberpunk-city, academy-school, island, desert, jungle, castle, spaceship, etc.

**Group: tone_mood** (~60 tags)
Emotional atmosphere and narrative style: cozy, dark, grim, whimsical, hopepunk, grimdark-tone, noir-atmosphere, suspenseful, heartwarming, humorous, satirical, epic-tone, etc.

**Group: structure** (~40 tags)
Narrative structure and POV: multiple-pov, unreliable-narrator, epistolary, dual-timeline, nonlinear, frame-narrative, anthology-format, first-person, omniscient, etc.

**Group: content_flags** (~80 tags)
Content warnings and mature themes: violence-graphic, sexual-content-explicit, profanity-heavy, gore, drug-use, mental-illness, racism, etc.

### Relationship Tables

#### Junction Tables for Many-to-Many Relationships

```sql
-- Supergenre ↔ Domain relationships
CREATE TABLE supergenre_domains (
  supergenre_id UUID REFERENCES supergenres(id),
  domain_id UUID REFERENCES domains(id),
  PRIMARY KEY (supergenre_id, domain_id)
);

-- Genre ↔ Domain relationships  
CREATE TABLE genre_domains (
  genre_id UUID REFERENCES genres(id),
  domain_id UUID REFERENCES domains(id), 
  PRIMARY KEY (genre_id, domain_id)
);

-- Genre ↔ Supergenre relationships
CREATE TABLE genre_supergenres (
  genre_id UUID REFERENCES genres(id),
  supergenre_id UUID REFERENCES supergenres(id),
  PRIMARY KEY (genre_id, supergenre_id)
);

-- Subgenre cross-attachments to additional genres
CREATE TABLE subgenre_genres (
  subgenre_id UUID REFERENCES subgenres(id),
  genre_id UUID REFERENCES genres(id),
  PRIMARY KEY (subgenre_id, genre_id)
);
```

#### Book Classification Tables

```sql
-- Books ↔ Taxonomy relationships
CREATE TABLE book_domains (
  book_id UUID REFERENCES books(id),
  domain_id UUID REFERENCES domains(id),
  UNIQUE (book_id)  -- One domain per book
);

CREATE TABLE book_genres (
  book_id UUID REFERENCES books(id),
  genre_id UUID REFERENCES genres(id),
  UNIQUE (book_id, genre_id)  -- Multiple genres allowed
);

CREATE TABLE book_subgenres (
  book_id UUID REFERENCES books(id),
  subgenre_id UUID REFERENCES subgenres(id),
  confidence REAL,  -- AI confidence score (optional)
  UNIQUE (book_id, subgenre_id)
);

CREATE TABLE book_formats (
  book_id UUID REFERENCES books(id),
  format_id UUID REFERENCES formats(id),
  UNIQUE (book_id, format_id)  -- Multiple formats allowed
);

CREATE TABLE book_age_markets (
  book_id UUID REFERENCES books(id),
  age_market_id UUID REFERENCES age_markets(id),
  UNIQUE (book_id)  -- One age market per book
);

CREATE TABLE book_cross_tags (
  book_id UUID REFERENCES books(id),
  cross_tag_id UUID REFERENCES cross_tags(id),
  confidence REAL,  -- AI confidence score (optional)
  UNIQUE (book_id, cross_tag_id)
);
```

### Alias System

#### `aliases`
Maps alternative terms to canonical slugs for search compatibility.
```sql
CREATE TABLE aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('genre', 'subgenre', 'tag', 'format', 'supergenre')),
  alias TEXT NOT NULL,            -- Alternative term
  canonical_slug TEXT NOT NULL,   -- Official slug to map to
  UNIQUE (kind, alias)
);
```

**Examples**:
- `grimdark` → `grimdark` (subgenre)
- `romantasy` → `romantasy` (subgenre) 
- `truck-kun` → `isekai` (tag)
- `gamelit` → `litrpg-system` (tag)
- `bio` → `biography` (genre)

## Usage Patterns

### Book Classification Workflow

1. **Domain Assignment**: Fiction or Nonfiction (required, single)
2. **Genre Assignment**: 1-3 primary genres (required, multiple allowed)
3. **Subgenre Assignment**: 1-5 specific subgenres (optional, multiple allowed)
4. **Format Assignment**: Physical/structural form (required, multiple allowed)
5. **Age Market Assignment**: Target audience (optional, single)
6. **Cross-tag Assignment**: Tropes, themes, settings, etc. (optional, multiple allowed)

### Search and Filtering

#### Hierarchical Browsing
```sql
-- Browse all Fantasy subgenres
SELECT s.slug, s.name 
FROM subgenres s 
JOIN genres g ON s.genre_id = g.id 
WHERE g.slug = 'fantasy';

-- Browse all Speculative Fiction genres  
SELECT g.slug, g.name
FROM genres g
JOIN genre_supergenres gs ON g.id = gs.genre_id
JOIN supergenres sg ON gs.supergenre_id = sg.id
WHERE sg.slug = 'speculative-fiction';
```

#### Multi-Dimensional Filtering
```sql
-- Find YA Fantasy Novels with Romance elements
SELECT DISTINCT b.title
FROM books b
JOIN book_age_markets bam ON b.id = bam.book_id
JOIN age_markets am ON bam.age_market_id = am.id
JOIN book_genres bg ON b.id = bg.book_id  
JOIN genres g ON bg.genre_id = g.id
JOIN book_formats bf ON b.id = bf.book_id
JOIN formats f ON bf.format_id = f.id
JOIN book_cross_tags bct ON b.id = bct.book_id
JOIN cross_tags ct ON bct.cross_tag_id = ct.id
WHERE am.slug = 'young-adult'
  AND g.slug = 'fantasy'
  AND f.slug = 'novel'
  AND ct.slug IN ('enemies-to-lovers', 'forbidden-love');
```

#### Tag-based Discovery
```sql
-- Find all books with "time-travel" theme
SELECT b.title, g.name as genre
FROM books b
JOIN book_cross_tags bct ON b.id = bct.book_id
JOIN cross_tags ct ON bct.cross_tag_id = ct.id
JOIN book_genres bg ON b.id = bg.book_id
JOIN genres g ON bg.genre_id = g.id  
WHERE ct.slug = 'time-travel';
```

### Auto-Classification with Heuristics

The system includes regex patterns for automatically detecting common elements:

```typescript
// Example heuristic patterns
ISEKAI_PATTERNS = /\b(truck-kun|reincarnation|another world|isekai)\b/i;
TIME_LOOP_PATTERNS = /\b(groundhog day|time loop|repeating day)\b/i;
ROMANCE_PATTERNS = /\b(love story|romance|enemies to lovers)\b/i;
```

These can be applied to book descriptions during ingestion to suggest appropriate cross-tags.

## Data Relationships Summary

### One-to-Many
- Domain → Supergenres (supergenres belong to 1+ domains)
- Supergenre → Genres (genres belong to 1+ supergenres)  
- Genre → Subgenres (subgenres have 1 primary genre)

### Many-to-Many  
- Subgenres ↔ Genres (cross-attachments)
- Books ↔ Genres (multi-genre works)
- Books ↔ Subgenres (detailed classification)
- Books ↔ Formats (e.g., graphic novel + omnibus)
- Books ↔ Cross-tags (multiple tropes/themes)

### One-to-One (per book)
- Book → Domain (fiction or nonfiction)
- Book → Age Market (single target audience)

## Performance Considerations

### Indexes
- All foreign keys are indexed
- Full-text search indexes on names using pg_trgm
- Composite indexes on frequently queried combinations

### Query Optimization
- Use EXISTS for filtering rather than JOINs when possible
- Consider materialized views for complex hierarchical queries
- Cache taxonomy metadata in application layer

## Future Extensions

### Easy to Add
- New genres/subgenres (just insert into existing tables)
- New cross-tags (orthogonal to content classification)
- New formats (independent dimension)

### Structural Changes
- Additional hierarchy levels (e.g., micro-genres below subgenres)
- New orthogonal dimensions (e.g., publication era, language)
- Weighted relationships (importance/relevance scores)

## Migration from Legacy System

The legacy system had:
- 7 top-level "genres" (including formats like Poetry, Drama)
- 296 "subgenres" (mix of actual subgenres, formats, and age markets)

The new system properly separates these concerns:
- **Content**: Domain → Supergenre → Genre → Subgenre
- **Structure**: Formats (novel, poetry-collection, drama-play)
- **Audience**: Age Markets (middle-grade, young-adult, adult)
- **Elements**: Cross-tags (tropes, themes, settings, moods)

This separation enables much more sophisticated filtering and discovery capabilities while maintaining clean data relationships.

## API Usage Examples

### Get Full Taxonomy Hierarchy
```typescript
// Get all fantasy subgenres with their cross-attachments
const fantasySubgenres = await db.query(`
  SELECT 
    s.slug,
    s.name,
    s.description,
    array_agg(DISTINCT ag.slug) as also_genres
  FROM subgenres s
  JOIN genres g ON s.genre_id = g.id
  LEFT JOIN subgenre_genres sg ON s.id = sg.subgenre_id  
  LEFT JOIN genres ag ON sg.genre_id = ag.id
  WHERE g.slug = 'fantasy'
  GROUP BY s.slug, s.name, s.description
`);
```

### Advanced Book Filtering
```typescript
// Multi-dimensional search
const books = await searchBooks({
  genres: ['fantasy', 'science-fiction'],
  subgenres: ['epic-fantasy', 'space-opera'],
  formats: ['novel'],
  ageMarkets: ['adult'],
  crossTags: ['chosen-one', 'space-station'],
  contentFlags: { exclude: ['violence-graphic'] }
});
```

This taxonomy system provides a solid foundation for sophisticated book discovery, filtering, and recommendation features while maintaining clean separation of concerns and extensibility for future needs.