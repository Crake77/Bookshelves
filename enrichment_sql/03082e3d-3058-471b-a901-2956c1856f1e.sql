-- Enrichment SQL for: Justice in Young Adult Speculative Fiction
-- Book ID: 03082e3d-3058-471b-a901-2956c1856f1e
-- Generated: 2025-10-23T19:13:46.617Z

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
  description = 'This scholarly work examines how young adult speculative fiction has become a primary vehicle for exploring justice concepts in contemporary literature. Oziewicz argues that YA fantasy, dystopia, and science fiction serve as experimental spaces where new understandings of justice are tested and developed for readers who will shape future society.

The book applies cognitive science to literary analysis, proposing that complex ideas like justice are processed mentally as scripts—patterns of understanding that narratives can reinforce or challenge. Oziewicz traces how various justice types have been represented across speculative fiction from nineteenth-century fairy tales through modern YA literature.

The study categorizes and analyzes multiple justice frameworks: poetic justice, retributive justice, restorative justice, environmental justice, social justice, and emerging global justice concepts. Each framework appears in different ways across fantasy and science fiction, allowing young readers to encounter and evaluate competing ideas about fairness, punishment, redemption, and societal organization.

Oziewicz connects the twentieth-century expansion of YA speculative fiction with civil rights movements and evolving justice philosophy, suggesting these are not coincidental parallels. The book argues that nonmimetic genres appeal to readers partly because they allow exploration of justice ideals freed from realistic constraints.

The work contributes to academic discussion about the educational and social functions of YA literature, particularly speculative genres. By demonstrating how these stories develop readers'' justice consciousness, Oziewicz makes a case for the relevance of fantasy and science fiction in preparing young people for an interconnected, environmentally threatened world requiring new approaches to fairness and equity.',
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

-- Insert cross-tags (5 tags)
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'complex';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'poetic';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'fairy';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'revolution';
INSERT INTO book_cross_tags (book_id, cross_tag_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM cross_tags WHERE slug = 'educational-tone';

-- Insert audience
INSERT INTO book_age_markets (book_id, age_market_id)
SELECT '03082e3d-3058-471b-a901-2956c1856f1e', id FROM age_markets WHERE slug = 'adult';

