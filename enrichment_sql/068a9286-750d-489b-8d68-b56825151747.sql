-- Enrichment SQL for: Science Fiction
-- Book ID: 068a9286-750d-489b-8d68-b56825151747
-- Generated: 2025-10-23T14:48:12.938Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';
DELETE FROM book_supergenres WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';
DELETE FROM book_genres WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';
DELETE FROM book_subgenres WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';
DELETE FROM book_cross_tags WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';
DELETE FROM book_age_markets WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';
DELETE FROM book_formats WHERE book_id = '068a9286-750d-489b-8d68-b56825151747';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Isaac Asimov' , 'Greg Walz-Chojnacki' , 'Francis Reddy' ],
  cover_url = 'https://books.google.com/books/content?id=O72EoPJN4mUC&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '068a9286-750d-489b-8d68-b56825151747';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM supergenres WHERE slug = 'speculative-fiction';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM supergenres WHERE slug = 'science-technology';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM genres WHERE slug = 'reference';
INSERT INTO book_genres (book_id, genre_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM genres WHERE slug = 'science-fiction';

-- Insert subgenres
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM subgenres WHERE slug = 'hard-science-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM subgenres WHERE slug = 'military-science-fiction';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'hard-science-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'flash-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'micro-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'hypertext-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'eco-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'philosophical-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'post-colonial-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'realistic-science';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'speculative-science';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'book-club-pick';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'national-book-award';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'oprah-book-club';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'reese-book-club';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'bridge-book';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'middle-book';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'payoff-book';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'setup-book';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'book-ends-on-cliffhanger';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'deal-with-devil';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM cross_tags WHERE slug = 'defeat-with-dignity';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '068a9286-750d-489b-8d68-b56825151747', id FROM age_markets WHERE slug = 'children';

