-- Enrichment SQL for: When I'm Gone
-- Book ID: 04b43824-68d4-4ccb-bc3e-48570d9de19a
-- Generated: 2025-10-23T14:48:11.781Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';
DELETE FROM book_supergenres WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';
DELETE FROM book_genres WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';
DELETE FROM book_subgenres WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';
DELETE FROM book_cross_tags WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';
DELETE FROM book_age_markets WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';
DELETE FROM book_formats WHERE book_id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Abbi Glines' ],
  cover_url = 'https://books.google.com/books/content?id=dba8BwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '04b43824-68d4-4ccb-bc3e-48570d9de19a';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM supergenres WHERE slug = 'romance';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM genres WHERE slug = 'romance';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'house-vs-house';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'state-violence';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'beach-read';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'debut-novel';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'graphic-novel-adaptation';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'hail-mary';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'town-secret';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'ranch';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'seaside-town';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'small-town';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'southern-town';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'flash-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'micro-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'verse-novel';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'hypertext-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'cursed-house';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'deal-with-devil';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'defeat-with-dignity';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'eco-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM cross_tags WHERE slug = 'evil-house';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '04b43824-68d4-4ccb-bc3e-48570d9de19a', id FROM age_markets WHERE slug = 'adult';

