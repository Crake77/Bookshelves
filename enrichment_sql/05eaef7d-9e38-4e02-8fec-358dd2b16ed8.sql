-- Enrichment SQL for: Nebula Award Stories Five
-- Book ID: 05eaef7d-9e38-4e02-8fec-358dd2b16ed8
-- Generated: 2025-10-23T21:52:42.087Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';
DELETE FROM book_supergenres WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';
DELETE FROM book_genres WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';
DELETE FROM book_subgenres WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';
DELETE FROM book_cross_tags WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';
DELETE FROM book_age_markets WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';
DELETE FROM book_formats WHERE book_id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Science Fiction Writers of America' ],
  description = 'This fifth annual anthology collects the Nebula Award-winning and nominated short fiction from 1970, as selected by the Science Fiction Writers of America. The collection represents the genre during a particularly transformative period, capturing work from an era when science fiction was expanding beyond traditional boundaries.

The Nebula Awards recognize excellence in science fiction and fantasy as determined by professional writers in the field. These awards emerged during the 1960s as the genre underwent significant evolution, with authors pushing against established conventions and exploring more complex themes and experimental techniques.

This volume likely includes both winners and runners-up across the short story, novelette, and novella categories from the 1969 award year. The collection would feature prominent authors active during that period, when the New Wave movement was challenging traditional science fiction while classic authors continued producing influential work.

The anthology serves multiple purposes: documenting which stories the writing community valued most during this specific year, preserving important shorter works that might otherwise become difficult to find, and offering readers a curated selection representing science fiction''s state at the end of the 1960s.

For contemporary readers, these annual Nebula volumes provide insight into science fiction''s historical development and shifting concerns. The 1970 collection captures the genre as it grappled with social change, space age realities, environmental concerns, and questions about technology''s role in human life.

While individual story content varies, Nebula anthologies generally showcase strong craft, imaginative worldbuilding, and thematic depth. This collection offers both historical value and literary merit, presenting award-recognized work from a significant moment in science fiction''s evolution.',
  cover_url = 'https://books.google.com/books/content?id=NJFzGwAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '05eaef7d-9e38-4e02-8fec-358dd2b16ed8';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM supergenres WHERE slug = 'speculative-fiction';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM supergenres WHERE slug = 'science-technology';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM genres WHERE slug = 'science-fiction';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM age_markets WHERE slug = 'adult';

