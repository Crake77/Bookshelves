-- ============================================================
-- BATCH 001 MASTER ENRICHMENT SQL
-- ============================================================
-- Generated: 2025-10-23
-- Total Books: 10
-- 
-- This script applies all metadata enrichments for batch 001
-- Run this file to update all 10 books in a single transaction
--
-- IDEMPOTENT: Safe to run multiple times
-- ============================================================

BEGIN;

-- Book 1: (Eco)Anxiety in Nuclear Holocaust Fiction and Climate Fiction
\i 00df7f2a-9ba5-4835-a09a-2b87c50c81ec.sql

-- Book 2: Summer of Lovecraft: Cosmic Horror in the 1960s
\i 02901e6f-94d3-4104-9fd8-e609e75b6af0.sql

-- Book 3: Blue-Green Rehabilitation
\i 02bd1dc8-22dd-4727-b837-ea1096cc97d6.sql

-- Book 4: Justice in Young Adult Speculative Fiction
\i 03082e3d-3058-471b-a901-2956c1856f1e.sql

-- Book 5: The Complete Nebula Award-winning Fiction
\i 033508ff-bb34-41d9-aef2-141f4ed8dc84.sql

-- Book 6: The Invisible Life of Addie LaRue
\i 04537132-0262-4928-90cc-3b1abdbf04c4.sql

-- Book 7: The Fantasy and Necessity of Solidarity
\i 0482d088-1b9f-44c1-93d3-0678504c6e1b.sql

-- Book 8: When I'm Gone
\i 04b43824-68d4-4ccb-bc3e-48570d9de19a.sql

-- Book 9: Nebula Award Stories Five
\i 05eaef7d-9e38-4e02-8fec-358dd2b16ed8.sql

-- Book 10: Science Fiction
\i 068a9286-750d-489b-8d68-b56825151747.sql

COMMIT;

-- ============================================================
-- BATCH 001 ENRICHMENT COMPLETE
-- ============================================================
