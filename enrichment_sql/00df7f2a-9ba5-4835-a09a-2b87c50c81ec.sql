-- Enrichment SQL for: (Eco)Anxiety in Nuclear Holocaust Fiction and Climate Fiction
-- Book ID: 00df7f2a-9ba5-4835-a09a-2b87c50c81ec
-- Generated: 2025-10-23T14:59:09.443Z

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

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM genres WHERE slug = 'literary-fiction';
INSERT INTO book_genres (book_id, genre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM genres WHERE slug = 'science-fiction';

-- Insert subgenres
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM subgenres WHERE slug = 'experimental-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM subgenres WHERE slug = 'philosophical-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM subgenres WHERE slug = 'postmodern-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM subgenres WHERE slug = 'hard-science-fiction';
INSERT INTO book_subgenres (book_id, subgenre_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM subgenres WHERE slug = 'military-science-fiction';

-- Insert cross-tags (20 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'climate-disaster';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'clear-good-vs-evil';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'hard-science-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'post-colonial-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'down-syndrome-mc';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'far-future-earth';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'arch-demon';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'not-what-they-seem';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'rocks-fall-everyone-dies';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'anxiety';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'holocaust';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'anxiety-rep';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'flash-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'micro-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'hypertext-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'alien-mate';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'climate-apocalypse';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'eco-fiction';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'mate-bond';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM cross_tags WHERE slug = 'no-clear-villain';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '00df7f2a-9ba5-4835-a09a-2b87c50c81ec', id FROM age_markets WHERE slug = 'adult';

