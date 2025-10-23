-- Enrichment SQL for: The Fantasy and Necessity of Solidarity
-- Book ID: 0482d088-1b9f-44c1-93d3-0678504c6e1b
-- Generated: 2025-10-23T21:52:41.928Z

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
  description = 'Writer and activist Sarah Schulman examines the psychological and social complexities of solidarity movements, drawing from decades of experience in queer activism, AIDS advocacy, and anti-war organizing. The book challenges common assumptions about solidarity work, arguing that both those seeking support and those offering it operate within fantasies that often lead to disappointment and conflict.

Schulman identifies competing fantasies at play in solidarity movements. Oppressed groups hope for intervention from bystanders, accountability for oppressors, and relief from injustice. Meanwhile, those standing in solidarity imagine their actions will be effective, cost-free, and rewarded with gratitude and friendship. These misaligned expectations create inevitable friction even within movements working toward shared goals.

The book examines multiple case studies spanning decades and movements: abortion rights activism in post-Franco Spain, AIDS organizing in 1990s New York City, campus protests against Israel''s war on Gaza, and Schulman''s experiences as a queer female artist navigating male-dominated cultural industries. Through these examples, she draws connections between various struggles for justice.

Schulman argues that effective solidarity requires acknowledging its limitations and costs. In globalized power structures, solidarity demands that bystanders and even conflicted perpetrators collaborate with the excluded and oppressed, accepting that such action may be difficult, expensive, and unappreciated.

The book offers both critique and possibility, recognizing solidarity''s inherent challenges while asserting its necessity for progressive change. Schulman''s analysis is particularly timely given current debates around ally-ship, identity politics, and movement building. Her work provides practical and philosophical frameworks for those engaged in or studying social justice organizing.',
  cover_url = 'https://covers.openlibrary.org/b/olid/OL56957378M-L.jpg'
WHERE id = '0482d088-1b9f-44c1-93d3-0678504c6e1b';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM domains WHERE slug = 'non-fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM supergenres WHERE slug = 'science-technology';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM genres WHERE slug = 'sociology';

-- Insert cross-tags (7 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'abortion';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'liberation';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'artistic';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'poetic';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'uplifting';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'war';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM cross_tags WHERE slug = 'queer';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '0482d088-1b9f-44c1-93d3-0678504c6e1b', id FROM age_markets WHERE slug = 'adult';

