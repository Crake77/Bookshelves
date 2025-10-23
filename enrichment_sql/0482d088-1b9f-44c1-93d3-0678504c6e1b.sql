-- Enrichment SQL for: The Fantasy and Necessity of Solidarity
-- Book ID: 0482d088-1b9f-44c1-93d3-0678504c6e1b
-- Generated: 2025-10-23T14:33:35.197Z

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
  authors = '["Sarah Schulman"]',
  description = 'Writer and activist Sarah Schulman examines the psychological and social complexities of solidarity movements, drawing from decades of experience in queer activism, AIDS advocacy, and anti-war organizing. The book challenges common assumptions about solidarity work, arguing that both those seeking support and those offering it operate within fantasies that often lead to disappointment and conflict.

Schulman identifies competing fantasies at play in solidarity movements. Oppressed groups hope for intervention from bystanders, accountability for oppressors, and relief from injustice. Meanwhile, those standing in solidarity imagine their actions will be effective, cost-free, and rewarded with gratitude and friendship. These misaligned expectations create inevitable friction even within movements working toward shared goals.

The book examines multiple case studies spanning decades and movements: abortion rights activism in post-Franco Spain, AIDS organizing in 1990s New York City, campus protests against Israel''s war on Gaza, and Schulman''s experiences as a queer female artist navigating male-dominated cultural industries. Through these examples, she draws connections between various struggles for justice.

Schulman argues that effective solidarity requires acknowledging its limitations and costs. In globalized power structures, solidarity demands that bystanders and even conflicted perpetrators collaborate with the excluded and oppressed, accepting that such action may be difficult, expensive, and unappreciated.

The book offers both critique and possibility, recognizing solidarity''s inherent challenges while asserting its necessity for progressive change. Schulman''s analysis is particularly timely given current debates around ally-ship, identity politics, and movement building. Her work provides practical and philosophical frameworks for those engaged in or studying social justice organizing.',
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

