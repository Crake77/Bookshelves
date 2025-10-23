-- Enrichment SQL for: The Invisible Life of Addie LaRue
-- Book ID: 04537132-0262-4928-90cc-3b1abdbf04c4
-- Generated: 2025-10-23T21:52:41.847Z

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
  description = 'In 1714 France, a young woman named Addie LaRue makes a desperate bargain to escape an unwanted marriage. She prays to the gods for freedom, and when darkness answers, she receives immortality—but at a terrible cost. Everyone who meets her immediately forgets her the moment she leaves their sight.

For three hundred years, Addie lives as a ghost in plain sight, unable to leave a mark on the world or form lasting connections. She cannot be remembered, cannot be photographed, and leaves no trace of her existence. Each encounter must be carefully managed, each relationship abandoned before dawn. She learns to steal what she needs and finds brief moments of art and beauty while navigating a life of perpetual anonymity.

The story follows Addie across centuries as she encounters the dark figure who cursed her, a being she both resents and finds herself drawn to through their intermittent meetings. Their complex relationship evolves over the decades as she struggles against the terms of their bargain.

In present-day New York, everything changes when Addie meets Henry, a young man who somehow remembers her. For the first time in three centuries, she can be known by another person, opening possibilities she thought forever closed. But Henry has his own secrets, and their connection will force Addie to confront what she truly wants from her immortal existence.

The novel explores themes of legacy, memory, and what makes a life meaningful when you cannot be remembered. It questions whether existence without connection has value and examines the human need to be seen and known by others.',
  cover_url = 'https://covers.openlibrary.org/b/olid/OL28151758M-L.jpg'
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

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '04537132-0262-4928-90cc-3b1abdbf04c4', id FROM age_markets WHERE slug = 'adult';

