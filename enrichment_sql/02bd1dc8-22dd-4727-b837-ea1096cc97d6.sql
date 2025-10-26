-- Enrichment SQL for: Blue-Green Rehabilitation
-- Book ID: 02bd1dc8-22dd-4727-b837-ea1096cc97d6
-- Generated: 2025-10-25T21:38:51.338Z

-- Clean up existing taxonomy links
DELETE FROM book_domains WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_supergenres WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_genres WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_subgenres WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_cross_tags WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_age_markets WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';
DELETE FROM book_formats WHERE book_id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';

-- Update book metadata
UPDATE books SET
  authors = ARRAY['Philip Hayward' ],
  description = 'This collection of nine international case studies examines urban waterway rehabilitation projects that combine water features with adjacent green spaces—so-called blue-green corridors. These initiatives have become increasingly popular in urban planning as cities seek to revitalize neglected industrial waterfronts and polluted rivers.

The anthology explores both successes and complications arising from these rehabilitation efforts. Successful projects have provided residents with recreational opportunities including swimming, kayaking, and waterside relaxation while attracting tourism. Restored green spaces have enabled native species to return, and preserved industrial heritage has added cultural value to these corridors.

However, the book also examines significant challenges. Gentrification often follows rehabilitation, driving up housing costs and displacing established communities. De-industrialization can eliminate employment opportunities for local residents, creating economic hardship even as environmental conditions improve. The studies analyze these competing stakeholder interests and the tension between ecological restoration and social equity.

Each case study investigates the political, economic, and social dynamics of waterway transformation, exploring how cities negotiate between conservation, development, and community needs. The anthology examines destination branding strategies and how local projects fit within regional and national frameworks.

The conclusion synthesizes lessons from these diverse examples to propose principles for more equitable and sustainable blue-green development. This work serves as a practical reference for urban planners, policymakers, and researchers working on waterfront rehabilitation projects, offering insights into avoiding common pitfalls while maximizing environmental and social benefits.',
  cover_url = 'https://covers.openlibrary.org/b/olid/OL57546024M-L.jpg'
WHERE id = '02bd1dc8-22dd-4727-b837-ea1096cc97d6';

-- Insert domain
INSERT INTO book_domains (book_id, domain_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM domains WHERE slug = 'fiction';

-- Insert supergenres
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM supergenres WHERE slug = 'business-economics';
INSERT INTO book_supergenres (book_id, supergenre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM supergenres WHERE slug = 'speculative-fiction';

-- Insert genres
INSERT INTO book_genres (book_id, genre_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM genres WHERE slug = 'fantasy';

-- Insert cross-tags (2 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id, confidence, method)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id, 0.9, 'pattern-match+evidence' FROM cross_tags WHERE slug = 'neglect';
INSERT INTO book_cross_tags (book_id, cross_tag_id, confidence, method)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id, 0.9, 'pattern-match+evidence' FROM cross_tags WHERE slug = 'conclusion';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM age_markets WHERE slug = 'adult';

-- Insert format
INSERT INTO book_formats (book_id, format_id)
SELECT '02bd1dc8-22dd-4727-b837-ea1096cc97d6', id FROM formats WHERE slug = 'anthology';

