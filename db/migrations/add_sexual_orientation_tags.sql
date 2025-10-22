-- Add sexual orientation and identity tags for better representation
INSERT INTO tags (slug, name, tag_group) VALUES 
  ('heterosexual', 'Heterosexual', 'tropes_themes'),
  ('gay', 'Gay', 'tropes_themes'),
  ('lesbian', 'Lesbian', 'tropes_themes'),
  ('bisexual', 'Bisexual', 'tropes_themes'),
  ('yuri', 'Yuri', 'tropes_themes'),
  ('yaoi', 'Yaoi', 'tropes_themes'),
  ('lgbtq', 'LGBTQ+', 'tropes_themes'),
  ('transgender', 'Transgender', 'tropes_themes'),
  ('nonbinary', 'Non-Binary', 'tropes_themes'),
  ('queer', 'Queer', 'tropes_themes'),
  ('pansexual', 'Pansexual', 'tropes_themes'),
  ('asexual', 'Asexual', 'tropes_themes'),
  ('aromantic', 'Aromantic', 'tropes_themes'),
  ('polyamorous', 'Polyamorous', 'tropes_themes'),
  ('demisexual', 'Demisexual', 'tropes_themes')
ON CONFLICT (slug) DO NOTHING;
