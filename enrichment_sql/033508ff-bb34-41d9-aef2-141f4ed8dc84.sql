-- Enrichment SQL for: The Complete Nebula Award-winning Fiction
-- Book ID: 033508ff-bb34-41d9-aef2-141f4ed8dc84
-- Generated: 2025-10-23T14:48:10.027Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_supergenres WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_genres WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_subgenres WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_cross_tags WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_age_markets WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_formats WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Samuel R. Delany' ],
  cover_url = 'https://books.google.com/books/content?id=tMidtQEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM supergenres WHERE slug = 'speculative-fiction';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM supergenres WHERE slug = 'science-technology';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM genres WHERE slug = 'science-fiction';

-- Insert cross-tags (11 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'award-winner';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'national-book-award';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'nebula-winner';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'standalone-complete';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'flash-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'micro-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'hypertext-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'eco-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'hard-science-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'philosophical-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM cross_tags WHERE slug = 'post-colonial-fiction';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM age_markets WHERE slug = 'adult';

