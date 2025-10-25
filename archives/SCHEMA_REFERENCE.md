# Database Schema Reference

## Table Name Mappings & Aliases

This document clarifies the actual database table names vs. conceptual/conversational names.

### Taxonomy Tables

| Concept | Actual Table Name | Aliases |
|---------|------------------|---------|
| Genres | `genres` | genre |
| Subgenres | `subgenres` | subgenre, sub-genre |
| Domains | `domains` | domain |
| Supergenres | `supergenres` | supergenre, super-genre |
| Formats | `formats` | format |
| **Tags** | `cross_tags` | tag, tags, cross-tag |
| **Audiences** | `age_markets` | audience, audiences, age-market, age_market |

### Link Tables (Many-to-Many)

| Concept | Actual Table Name | Aliases |
|---------|------------------|---------|
| Book-Genre Links | `book_genres` | book_genre_links |
| Book-Subgenre Links | `book_subgenres` | book_subgenre_links |
| Book-Domain Links | `book_domains` | book_domain_links |
| Book-Supergenre Links | `book_supergenres` | book_supergenre_links |
| Book-Format Links | `book_formats` | book_format_links |
| **Book-Tag Links** | `book_cross_tags` | book_tag_links, book_tags |
| **Book-Audience Links** | `book_age_markets` | book_audience_links, book_audiences |

### Core Content Tables

| Concept | Actual Table Name | Aliases |
|---------|------------------|---------|
| Books | `books` | book |
| Works | `works` | work |
| Editions | `editions` | edition |
| Release Events | `release_events` | release_event, releases |

### User & Preferences

| Concept | Actual Table Name | Aliases |
|---------|------------------|---------|
| Users | `users` | user |
| User Books (Shelves) | `user_books` | user_book, shelf_items |
| Custom Shelves | `custom_shelves` | shelf, shelves |
| Browse Preferences | `browse_category_preferences` | browse_prefs |

### Supporting Tables

| Concept | Actual Table Name | Aliases |
|---------|------------------|---------|
| Aliases (Author) | `aliases` | author_alias |
| Book Stats | `book_stats` | stats |
| Book Embeddings | `book_embeddings` | embeddings, vectors |

### Relationship Tables

| Concept | Actual Table Name |
|---------|------------------|
| Genre-Domain | `genre_domains` |
| Genre-Supergenre | `genre_supergenres` |
| Subgenre-Genre | `subgenre_genres` |
| Supergenre-Domain | `supergenre_domains` |

---

## Quick Reference: When You Say... I Know You Mean...

- **"audience table"** → `age_markets`
- **"tag table"** → `cross_tags`
- **"book genre links"** → `book_genres`
- **"book tag links"** → `book_cross_tags`
- **"book audience links"** → `book_age_markets`

---

## Schema Patterns

### Standard Taxonomy Pattern
```sql
-- Taxonomy table
CREATE TABLE taxonomy_name (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- Book link table
CREATE TABLE book_taxonomy_name (
  book_id UUID REFERENCES books(id),
  taxonomy_slug TEXT REFERENCES taxonomy_name(slug),
  PRIMARY KEY (book_id, taxonomy_slug)
);
```

### Actual Table Names Follow This Pattern:
- Taxonomy: `genres`, `subgenres`, `cross_tags`, `age_markets`, etc.
- Links: `book_genres`, `book_subgenres`, `book_cross_tags`, `book_age_markets`

---

## Important Notes

1. **Link tables use plural form**: `book_genres` not `book_genre`
2. **Tags are called cross_tags**: This suggests they may be used across multiple contexts
3. **Audiences are age_markets**: Implies age-based market segmentation (children, YA, adult, etc.)
4. **Foreign keys use slugs**: Link tables reference taxonomy by `slug` not `id`

---

## Column Conventions

### Taxonomy Tables
```typescript
{
  id: UUID           // Primary key
  slug: TEXT         // URL-friendly unique identifier
  name: TEXT         // Display name
  // Some may have additional fields like 'group', 'description', etc.
}
```

### Link Tables
```typescript
{
  book_id: UUID                // References books.id
  [taxonomy]_slug: TEXT        // References taxonomy.slug
  // Primary key is composite: (book_id, taxonomy_slug)
}
```

---

**Last Updated**: 2025-10-22
**Schema Version**: Current production
