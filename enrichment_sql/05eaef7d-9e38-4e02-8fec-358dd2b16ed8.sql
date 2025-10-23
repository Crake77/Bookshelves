-- Enrichment SQL for: Nebula Award Stories Five
-- Book ID: 05eaef7d-9e38-4e02-8fec-358dd2b16ed8
-- Generated: 2025-10-23T14:48:12.363Z

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

-- Insert cross-tags (7 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'award-winner';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'big-five-publisher';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'national-book-award';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'nebula-winner';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'five-act-structure';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'anthology-connected-stories';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM cross_tags WHERE slug = 'interconnected-stories';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '05eaef7d-9e38-4e02-8fec-358dd2b16ed8', id FROM age_markets WHERE slug = 'adult';

