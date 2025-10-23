-- Enrichment SQL for: Justice in Young Adult Speculative Fiction
-- Book ID: 03082e3d-3058-471b-a901-2956c1856f1e
-- Generated: 2025-10-23T14:48:09.402Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';
DELETE FROM book_supergenres WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';
DELETE FROM book_genres WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';
DELETE FROM book_subgenres WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';
DELETE FROM book_cross_tags WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';
DELETE FROM book_age_markets WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';
DELETE FROM book_formats WHERE book_id = '03082e3d-3058-471b-a901-2956c1856f1e';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Marek C. Oziewicz' ],
  cover_url = 'https://books.google.com/books/content?id=TX5KCAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '03082e3d-3058-471b-a901-2956c1856f1e';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM domains WHERE slug = 'non-fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM supergenres WHERE slug = 'literature-writing';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM genres WHERE slug = 'literary-fiction';
INSERT INTO book_genres (book_id, genre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM genres WHERE slug = 'science-fiction';

-- Insert subgenres
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM subgenres WHERE slug = 'experimental-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM subgenres WHERE slug = 'philosophical-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM subgenres WHERE slug = 'postmodern-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM subgenres WHERE slug = 'stream-of-consciousness';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM subgenres WHERE slug = 'first-contact';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'hard-science-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'speculative-science';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'civil-rights-activist-mc';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'fairy-tale';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'arch-demon';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'dark-fairy-tale';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'fairy-tale-ending';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'fairy-tale-retelling';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'human-evolution';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'twisted-fairy-tale';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'world-war-fantasy';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'flash-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'micro-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'hypertext-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'eco-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'philosophical-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'post-colonial-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'child-abuse';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'child-death';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'eating-disorder';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM age_markets WHERE slug = 'adult';

