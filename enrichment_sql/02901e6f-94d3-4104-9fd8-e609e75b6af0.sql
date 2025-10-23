-- Enrichment SQL for: Summer of Lovecraft: Cosmic Horror in the 1960s
-- Book ID: 02901e6f-94d3-4104-9fd8-e609e75b6af0
-- Generated: 2025-10-23T19:13:45.736Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';
DELETE FROM book_supergenres WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';
DELETE FROM book_genres WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';
DELETE FROM book_subgenres WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';
DELETE FROM book_cross_tags WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';
DELETE FROM book_age_markets WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';
DELETE FROM book_formats WHERE book_id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Lois H. Gresh' ],
  description = 'This anthology brings together eighteen original Lovecraftian horror stories set during the 1960s, blending cosmic dread with the era''s counterculture. From the editors behind World War Cthulhu, these tales reimagine H.P. Lovecraft''s mythos against the backdrop of the Summer of Love, Vietnam, and social upheaval.

The collection features stories by Lois H. Gresh, Edward M. Erdelac, Pete Rawlik, William Meikle, and others, each exploring how ancient cosmic horrors might manifest during an age of psychedelic experimentation and cultural revolution. The juxtaposition of 1960s optimism with Lovecraftian nihilism creates a unique tension throughout the anthology.

Stories range from drug-fueled encounters with otherworldly entities to investigations of strange occurrences in Arkham and beyond. The anthology explores themes of forbidden knowledge, reality-bending substances, and the thin veil between our world and darker dimensions. Some tales incorporate period-specific elements like the music scene, anti-war movements, and social transformation, while others use the decade as atmospheric background for traditional cosmic horror.

The anthology offers variety in tone and approach, from visceral horror to psychological dread, unified by the Lovecraftian tradition of humanity''s insignificance against incomprehensible cosmic forces. Fans of both Lovecraft''s work and 1960s period pieces will find familiar territory reimagined through an unsettling lens where peace, love, and ancient evil collide.',
  cover_url = 'https://books.google.com/books/content?id=7KpdzAEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM domains WHERE slug = 'non-fiction';

-- Insert cross-tags (3 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'lovecraftian';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'war';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'cosmic-horror';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM age_markets WHERE slug = 'adult';

-- Insert format
INSERT INTO book_formats (book_id, format_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM formats WHERE slug = 'anthology';

