-- Book taxonomy database schema (v2 - production ready)
-- This schema defines a flexible taxonomy for a reading tracker app.

-- Enable pg_trgm extension for text search support (PostgreSQL specific)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================
-- Domains: top‑level binary split (fiction, nonfiction)
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================
-- Supergenres: umbrella groupings that sit between domains and genres.  These are not always exposed directly to end users but help organise the hierarchy.  A supergenre can span both domains.
CREATE TABLE supergenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- Junction between supergenres and domains (many to many)
CREATE TABLE supergenre_domains (
  supergenre_id UUID NOT NULL REFERENCES supergenres(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  PRIMARY KEY (supergenre_id, domain_id)
);

-- =============================
-- Genres: primary classification exposed to users.  A genre may belong to multiple domains via genre_domains and multiple supergenres via genre_supergenres.
CREATE TABLE genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- Junction between genres and domains (many to many)
CREATE TABLE genre_domains (
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  PRIMARY KEY (genre_id, domain_id)
);

-- Junction between genres and supergenres (many to many)
CREATE TABLE genre_supergenres (
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  supergenre_id UUID NOT NULL REFERENCES supergenres(id) ON DELETE CASCADE,
  PRIMARY KEY (genre_id, supergenre_id)
);

-- =============================
-- Subgenres: most specific classification.  Each subgenre has one primary parent genre but may cross‑attach to additional genres via subgenre_genres.
CREATE TABLE subgenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- Cross‑attach subgenres to additional genres (many to many)
CREATE TABLE subgenre_genres (
  subgenre_id UUID NOT NULL REFERENCES subgenres(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (subgenre_id, genre_id)
);

-- =============================
-- Formats: describes the structural/physical form of the work.  Independent of genre and audience.
CREATE TABLE formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================
-- Age markets: defines target readership age ranges.
CREATE TABLE age_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_age INT,
  max_age INT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================
-- Cross‑tags: orthogonal attributes like tropes, themes, settings, mood, structure, and content flags.
CREATE TABLE cross_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "group" TEXT NOT NULL CHECK ("group" IN ('tropes_themes', 'setting', 'tone_mood', 'structure', 'content_flags')),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================
-- Aliases: synonyms for search.  Useful for linking variant terms to canonical slugs across genres, subgenres, tags, and formats.
CREATE TABLE aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('genre', 'subgenre', 'tag', 'format', 'supergenre')),
  alias TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  UNIQUE (kind, alias)
);

-- =============================
-- Junction tables linking books to each classification (primary keys not defined here because book_id references external books table).  Each junction ensures uniqueness per book.
CREATE TABLE book_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  UNIQUE (book_id)
);

CREATE TABLE book_supergenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  supergenre_id UUID NOT NULL REFERENCES supergenres(id) ON DELETE CASCADE,
  UNIQUE (book_id, supergenre_id)
);

CREATE TABLE book_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  UNIQUE (book_id, genre_id)
);

CREATE TABLE book_subgenres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  subgenre_id UUID NOT NULL REFERENCES subgenres(id) ON DELETE CASCADE,
  confidence REAL,
  UNIQUE (book_id, subgenre_id)
);

CREATE TABLE book_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  format_id UUID NOT NULL REFERENCES formats(id) ON DELETE CASCADE,
  UNIQUE (book_id, format_id)
);

CREATE TABLE book_age_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  age_market_id UUID NOT NULL REFERENCES age_markets(id) ON DELETE CASCADE,
  UNIQUE (book_id)
);

CREATE TABLE book_cross_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  cross_tag_id UUID NOT NULL REFERENCES cross_tags(id) ON DELETE CASCADE,
  confidence REAL,
  UNIQUE (book_id, cross_tag_id)
);

-- =============================
-- Indexes for performance
CREATE INDEX idx_subgenres_genre ON subgenres (genre_id);
CREATE INDEX idx_supergenre_domains_domain ON supergenre_domains (domain_id);
CREATE INDEX idx_genre_domains_domain ON genre_domains (domain_id);
CREATE INDEX idx_genre_supergenres_supergenre ON genre_supergenres (supergenre_id);
CREATE INDEX idx_subgenre_genres_genre ON subgenre_genres (genre_id);
CREATE INDEX idx_book_domains_book ON book_domains (book_id);
CREATE INDEX idx_book_supergenres_book ON book_supergenres (book_id);
CREATE INDEX idx_book_genres_book ON book_genres (book_id);
CREATE INDEX idx_book_subgenres_book ON book_subgenres (book_id);
CREATE INDEX idx_book_formats_book ON book_formats (book_id);
CREATE INDEX idx_book_cross_tags_book ON book_cross_tags (book_id);

-- Full‑text search indexes using pg_trgm for fuzzy name matching
CREATE INDEX idx_genres_name_trgm ON genres USING GIN (name gin_trgm_ops);
CREATE INDEX idx_subgenres_name_trgm ON subgenres USING GIN (name gin_trgm_ops);
CREATE INDEX idx_cross_tags_name_trgm ON cross_tags USING GIN (name gin_trgm_ops);
CREATE INDEX idx_aliases_alias_trgm ON aliases USING GIN (alias gin_trgm_ops);