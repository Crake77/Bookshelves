-- Enrichment SQL for: The Fantasy and Necessity of Solidarity
-- Book ID: 0482d088-1b9f-44c1-93d3-0678504c6e1b
-- Generated: 2025-10-23T14:48:11.202Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';
DELETE FROM book_supergenres WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';
DELETE FROM book_genres WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';
DELETE FROM book_subgenres WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';
DELETE FROM book_cross_tags WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';
DELETE FROM book_age_markets WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';
DELETE FROM book_formats WHERE book_id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Sarah Schulman' ],
  cover_url = 'https://books.google.com/books/content?id=3msrEQAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM supergenres WHERE slug = 'science-technology';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM genres WHERE slug = 'fantasy';

-- Insert subgenres
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM subgenres WHERE slug = 'cozy-fantasy';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM subgenres WHERE slug = 'dark-fantasy';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM subgenres WHERE slug = 'epic-fantasy';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM subgenres WHERE slug = 'historical-fantasy';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM subgenres WHERE slug = 'mythic-fantasy';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'not-what-they-seem';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'queer-fantasy';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'world-war-fantasy';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'national-book-award';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'everything-comes-together';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'parallel-structure';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'race-against-time';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'civil-rights-activist-mc';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'social-media-format';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'artistic-struggle';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'book-ends-on-cliffhanger';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'deal-with-devil';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'dies-for-others';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'ends-justify-means';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'forced-to-work-with-team';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'friends-with-benefits';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'growing-power';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'high-elves';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'more-than-meets-eye';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'one-night-stand-to-more';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM age_markets WHERE slug = 'adult';

