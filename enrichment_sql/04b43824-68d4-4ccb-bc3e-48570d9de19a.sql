-- Enrichment SQL for: When I'm Gone
-- Book ID: 04b43824-68d4-4ccb-bc3e-48570d9de19a
-- Generated: 2025-10-23T14:59:09.978Z

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
  description = 'Set in the fictional Gulf Coast town of Rosemary Beach, this contemporary romance follows Reese Ellis, a Texas rancher who arrives at his famous rock star father''s estate and finds himself drawn to Mase, a young woman working as a housemaid there.

Reese has maintained distance from his father''s glamorous, chaotic world, preferring the straightforward life of ranch work in Texas. His visit to his father''s coastal mansion forces him into proximity with the entertainment industry lifestyle he has long avoided. There he encounters Mase, whose circumstances have brought her to domestic work in a place far removed from her own background and dreams.

The romance develops against the backdrop of class differences and the complex dynamics of the rock star''s household. Both characters carry their own histories and hesitations into their growing connection. Their relationship must navigate not only personal barriers but also the social and economic distances between Reese''s ranching life and Mase''s current situation.

The Rosemary Beach setting provides the story''s atmosphere—a wealthy coastal community where different worlds collide. The novel explores themes common to contemporary romance: overcoming personal past, bridging social divides, and finding connection despite circumstances that might keep two people apart.

Abbi Glines writes accessible contemporary romance focused on character relationships and emotional development. This installment in the Rosemary Beach series offers readers a romance narrative built around attraction across different life circumstances, with the added complication of family dynamics and the entertainment world''s influence on personal relationships. The story follows the genre''s conventions while incorporating the specific dynamics of its small-town-meets-celebrity setting.',
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

