-- Enrichment SQL for: (Eco)Anxiety in Nuclear Holocaust Fiction and Climate Fiction
-- Book ID: 00df7f2a-9ba5-4835-a09a-2b87c50c81ec
-- Generated: 2025-10-23T21:52:41.391Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';
DELETE FROM book_supergenres WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';
DELETE FROM book_genres WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';
DELETE FROM book_subgenres WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';
DELETE FROM book_cross_tags WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';
DELETE FROM book_age_markets WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';
DELETE FROM book_formats WHERE book_id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Dominika Oramus' ],
  description = 'This academic study examines apocalyptic fiction through the lens of psychological trauma, focusing on how nuclear holocaust narratives and climate fiction portray collective anxiety about impending disaster. Oramus analyzes what she terms "Doomsday Clock Narratives"—stories set in post-catastrophic worlds where characters await an even greater calamity.

The book explores how these narratives depict pretraumatic stress, a psychological condition where the certainty of future disaster creates present-day trauma. Characters in these stories inhabit landscapes marked by industrial decay and environmental collapse, viewed through the eyes of survivors who feel the countdown to extinction has already begun.

Drawing on novels by Walter M. Miller, Nevil Shute, J.G. Ballard, Paolo Bacigalupi, Ruth Ozeki, and others, Oramus traces how disaster fiction has evolved over the past century while maintaining core themes of anticipatory dread. The geological and environmental details in these works serve as archaeological evidence of human civilization''s self-destruction.

The study connects nuclear age anxieties with contemporary climate concerns, arguing that both genres express a shared psychological experience of waiting for catastrophe. This scholarly analysis is aimed at researchers and students of British and American literature, particularly those interested in science fiction studies and how speculative genres process cultural trauma and environmental anxiety.',
  cover_url = 'https://books.google.com/books/content?id=tNe-EAAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'
WHERE id = '00df7f2a-9ba5-4835-a09a-2b87c50c81ec';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM domains WHERE slug = 'non-fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM supergenres WHERE slug = 'literature-writing';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert cross-tags (3 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'anxiety';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'holocaust';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'countdown';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM age_markets WHERE slug = 'adult';

