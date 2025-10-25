-- Evidence Pack Architecture Migration
-- Adds source snapshot storage, FRBR-lite work references, and tag provenance
-- Safe to run multiple times (idempotent with IF NOT EXISTS checks)

-- ============================================================================
-- Part 1: Enable Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for digest/sha functions
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for future fuzzy title matching

-- ============================================================================
-- Part 2: FRBR-lite Work References
-- ============================================================================
-- Add work authority linkage (OpenLibrary Work ID or Wikidata QID)
ALTER TABLE works
  ADD COLUMN IF NOT EXISTS work_ref_type text,   -- 'openlibrary' | 'wikidata' | 'none'
  ADD COLUMN IF NOT EXISTS work_ref_value text;  -- e.g. 'OL12345W' or 'Q12345'

-- Index for efficient work reference lookups
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_works_work_ref') THEN
    CREATE INDEX idx_works_work_ref ON works (work_ref_type, work_ref_value) 
      WHERE work_ref_type IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- Part 3: Source Snapshots (Thin, Versioned Evidence Storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS source_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id     uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  source      text NOT NULL CHECK (source IN ('openlibrary', 'wikidata', 'wikipedia', 'googlebooks', 'lcsh')),
  source_key  text,            -- e.g. Wikidata QID, Wikipedia page title, OLID, volumeId
  revision    text,            -- Version identifier (wiki rev_id, wikidata lastmod, etc.)
  url         text,            -- Source URL
  license     text,            -- 'CC0', 'CC-BY-SA', 'API-TOS', etc.
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  sha256      text,            -- SHA-256 hash of extract for verification
  extract     text,            -- Trimmed 0.5-2KB excerpt used for tagging
  object_uri  text,            -- Optional: s3://... pointer to full gzipped JSON
  
  -- One snapshot per work per source (keep latest)
  CONSTRAINT uq_source_snapshot_work_source UNIQUE (work_id, source)
);

-- Indexes for efficient querying
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_source_snapshots_work') THEN
    CREATE INDEX idx_source_snapshots_work ON source_snapshots (work_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_source_snapshots_source_key') THEN
    CREATE INDEX idx_source_snapshots_source_key ON source_snapshots (source, source_key) 
      WHERE source_key IS NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_source_snapshots_fetched') THEN
    CREATE INDEX idx_source_snapshots_fetched ON source_snapshots (fetched_at DESC);
  END IF;
END $$;

-- ============================================================================
-- Part 4: Tag Provenance Fields
-- ============================================================================
-- Add provenance tracking to book_cross_tags
ALTER TABLE book_cross_tags
  ADD COLUMN IF NOT EXISTS source_ids uuid[],      -- References source_snapshots.id
  ADD COLUMN IF NOT EXISTS method text,             -- 'pattern-match' | 'llm' | 'hybrid' | 'user'
  ADD COLUMN IF NOT EXISTS tagged_at timestamptz DEFAULT now();

-- Add provenance tracking to book_subgenres
ALTER TABLE book_subgenres
  ADD COLUMN IF NOT EXISTS source_ids uuid[],      -- References source_snapshots.id
  ADD COLUMN IF NOT EXISTS method text,             -- 'pattern-match' | 'llm' | 'hybrid' | 'user'
  ADD COLUMN IF NOT EXISTS tagged_at timestamptz DEFAULT now();

-- Add provenance tracking to book_genres (optional, but good for consistency)
ALTER TABLE book_genres
  ADD COLUMN IF NOT EXISTS source_ids uuid[],
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS tagged_at timestamptz DEFAULT now();

-- ============================================================================
-- Part 5: Indexes for Provenance Queries
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_book_cross_tags_method') THEN
    CREATE INDEX idx_book_cross_tags_method ON book_cross_tags (method) WHERE method IS NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_book_cross_tags_confidence') THEN
    CREATE INDEX idx_book_cross_tags_confidence ON book_cross_tags (confidence) WHERE confidence IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- Part 6: Comments for Documentation
-- ============================================================================
COMMENT ON TABLE source_snapshots IS 'Thin, versioned snapshots of upstream source evidence used for book tagging. Stores 0.5-2KB extracts with optional full content in object storage.';
COMMENT ON COLUMN source_snapshots.extract IS 'Trimmed excerpt (0.5-2KB) actually used during tagging. Full content in object_uri if needed.';
COMMENT ON COLUMN source_snapshots.sha256 IS 'SHA-256 hash of extract for verification and fingerprinting.';
COMMENT ON COLUMN source_snapshots.object_uri IS 'Optional S3/R2 URI (s3://bucket/key) for full gzipped JSON content.';

COMMENT ON COLUMN works.work_ref_type IS 'FRBR-lite: Authority type for work deduplication (openlibrary|wikidata|none)';
COMMENT ON COLUMN works.work_ref_value IS 'FRBR-lite: Authority identifier (OL12345W, Q12345, etc.)';

COMMENT ON COLUMN book_cross_tags.source_ids IS 'Array of source_snapshot.id values that support this tag';
COMMENT ON COLUMN book_cross_tags.method IS 'Tagging method: pattern-match (rule-based), llm (AI), hybrid, user (manual)';
COMMENT ON COLUMN book_cross_tags.confidence IS 'AI confidence score 0.0-1.0; NULL for non-AI tags';

-- ============================================================================
-- Part 7: Helper Function for Harvest Fingerprint
-- ============================================================================
CREATE OR REPLACE FUNCTION get_work_harvest_fingerprint(p_work_id uuid)
RETURNS text AS $$
  SELECT encode(digest(string_agg(
    source || ':' || COALESCE(revision, 'null'), 
    ','
    ORDER BY source
  ), 'sha256'), 'hex')
  FROM source_snapshots
  WHERE work_id = p_work_id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_work_harvest_fingerprint IS 'Computes SHA-256 fingerprint of all source revisions for a work. Use to detect if re-tagging is needed.';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify the migration:
-- SELECT COUNT(*) FROM source_snapshots;
-- SELECT work_ref_type, COUNT(*) FROM works GROUP BY work_ref_type;
-- SELECT method, COUNT(*) FROM book_cross_tags GROUP BY method;
