-- Enrichment SQL for: The Complete Nebula Award-winning Fiction
-- Book ID: 033508ff-bb34-41d9-aef2-141f4ed8dc84
-- Generated: 2025-10-23T21:52:41.770Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_supergenres WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_genres WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_subgenres WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_cross_tags WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_age_markets WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';
DELETE FROM book_formats WHERE book_id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Samuel R. Delany' ],
  description = 'This comprehensive collection gathers all the Nebula Award-winning short fiction by Samuel R. Delany, one of science fiction''s most acclaimed and influential authors. The volume showcases the full range of Delany''s award-recognized shorter works, demonstrating why he became a central figure in New Wave science fiction.

Delany''s fiction is known for complex prose, sophisticated engagement with language, and exploration of marginalized perspectives. His stories often examine questions of communication, difference, and social structures through speculative frameworks. The collection likely includes his celebrated novella "The Star Pit" and other works that earned recognition from the Science Fiction Writers of America.

These stories showcase Delany''s distinctive approach to science fiction, which combines space opera elements with literary experimentation and philosophical inquiry. His work frequently addresses themes of alienation, identity, economics, and power, often featuring protagonists who exist on society''s margins.

The Nebula Awards represent recognition from Delany''s peers in the science fiction writing community, marking these stories as particularly significant within the genre. This complete collection offers readers the opportunity to experience the shorter fiction that established Delany''s reputation during science fiction''s transformative 1960s and 1970s era.

For readers interested in science fiction''s evolution beyond pulp traditions toward more literary and experimental territory, this volume provides essential examples of work that expanded the genre''s possibilities. The collection demonstrates how Delany helped reshape science fiction into a form capable of addressing complex social issues alongside technological speculation.',
  cover_url = 'https://covers.openlibrary.org/b/olid/OL24514166M-L.jpg'
WHERE id = '033508ff-bb34-41d9-aef2-141f4ed8dc84';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM supergenres WHERE slug = 'speculative-fiction';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM supergenres WHERE slug = 'science-technology';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM genres WHERE slug = 'science-fiction';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM age_markets WHERE slug = 'adult';

-- Insert format
INSERT INTO book_formats (book_id, format_id)
SELECT '033508ff-bb34-41d9-aef2-141f4ed8dc84', id FROM formats WHERE slug = 'anthology';

