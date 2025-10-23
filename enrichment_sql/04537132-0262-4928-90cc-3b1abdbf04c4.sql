-- Enrichment SQL for: The Invisible Life of Addie LaRue
-- Book ID: 04537132-0262-4928-90cc-3b1abdbf04c4
-- Generated: 2025-10-23T14:48:10.619Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';
DELETE FROM book_supergenres WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';
DELETE FROM book_genres WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';
DELETE FROM book_subgenres WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';
DELETE FROM book_cross_tags WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';
DELETE FROM book_age_markets WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';
DELETE FROM book_formats WHERE book_id = '04537132-0262-4928-90cc-3b1abdbf04c4';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['V. E. Schwab' ],
  cover_url = 'https://covers.openlibrary.org/b/isbn/9780765387561-L.jpg'
WHERE id = '04537132-0262-4928-90cc-3b1abdbf04c4';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM genres WHERE slug = 'fantasy';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'meaning-of-life';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'life-magic';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'life-reassessment';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'non-carbon-life';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'second-chance-at-life';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'silicon-based-life';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'slice-of-life';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'curse';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'cursed-artifact';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'cursed-house';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'cursed-object-horror';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'cursed-place';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'cursed-weapon';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'everyone-dies';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'everyone-is-grey';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'fae-bargain';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'fae-bargain-romance';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'family-curse';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'faustian-bargain';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM cross_tags WHERE slug = 'generational-curse';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM age_markets WHERE slug = 'adult';

