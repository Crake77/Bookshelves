-- Enrichment SQL for: Summer of Lovecraft: Cosmic Horror in the 1960s
-- Book ID: 02901e6f-94d3-4104-9fd8-e609e75b6af0
-- Generated: 2025-10-23T14:48:08.241Z

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
  cover_url = 'https://books.google.com/books/content?id=7KpdzAEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '02901e6f-94d3-4104-9fd8-e609e75b6af0';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM domains WHERE slug = 'fiction';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'short-story-collection';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'anthology-connected-stories';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'long-lost-sibling';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'one-night-stand-to-more';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'portal-to-another-world';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'summer-camp-horror';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'summer-camp';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'deep-sea-horror';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'first-love';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'hate-to-love';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'insta-love';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'learns-to-love-again';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'love-square';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'love-at-first-sight';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'marriage-of-convenience-to-love';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'one-sided-love';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'summer-romance';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'forbidden-love';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'love-triangle';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM cross_tags WHERE slug = 'unrequited-love';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '02901e6f-94d3-4104-9fd8-e609e75b6af0', id FROM age_markets WHERE slug = 'adult';

