-- Enrichment SQL for: Blue-Green Rehabilitation
-- Book ID: 02bd1dc8-22dd-4727-b837-ea1096cc97d6
-- Generated: 2025-10-23T14:48:08.820Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_supergenres WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_genres WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_subgenres WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_cross_tags WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_age_markets WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_formats WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Philip Hayward' ],
  cover_url = 'https://books.google.com/books/content?id=jHVsEQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM supergenres WHERE slug = 'business-economics';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM genres WHERE slug = 'business';
INSERT INTO book_genres (book_id, genre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM genres WHERE slug = 'economics';
INSERT INTO book_genres (book_id, genre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM genres WHERE slug = 'fantasy';

-- Insert subgenres
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM subgenres WHERE slug = 'development-economics';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM subgenres WHERE slug = 'urban-fantasy';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'green-future';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'plan-within-plan';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'point-of-no-return';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'trans-side-character';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'decades-old-case';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'return-of-the-king';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'fish-out-of-water';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'blue-collar-mc';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'anti-asian-racism';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'anti-black-racism';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'medication-side-effects';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'neglect';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'anthology';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'national-book-award';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'action-climax';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'action-not-talk';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'action-packed';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'all-according-to-plan';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'anthology-structure';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM cross_tags WHERE slug = 'case-of-the-week';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM age_markets WHERE slug = 'adult';

