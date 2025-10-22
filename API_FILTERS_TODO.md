# API Browse Filters - Implementation TODO

## Completed ✅
1. Added blockedTags, formatSlug, audienceSlug, domainSlug, supergenreSlug to BrowseParams interface
2. Added complete filter SQL clauses to `fetchPopular()` genre query (lines 467-505)
3. Content flags now separated from Tags in UI (only show in Content Flags section)
4. Blocked items display as red strikethrough chips on carousel

## Remaining Work 🚧

### 1. Add SQL Filters to Remaining Queries
The filter block from lines 472-505 needs to be copied to these locations:

**fetchPopular() - no genre path** (around line 563, after line 567):
```sql
-- Add after existing tagSlug filter, before closing )
-- Block filter, domain filter, supergenre filter, format filter, audience filter
```

**fetchHighestRated() - genre path** (around line 758, after line 762):
```sql
-- Add after existing tagSlug filter, before closing ),
```

**fetchHighestRated() - no genre path** (around line 842, after line 846):
```sql
-- Add after existing tagSlug filter, before closing ),
```

**fetchRecentlyAdded() - genre path** (around line 979, after line 983):
```sql
-- Add after existing tagSlug filter, before closing )
```

**fetchRecentlyAdded() - no genre path** (around line 1049, after line 1053):
```sql
-- Add after existing tagSlug filter, before closing )
```

**fetchForYou() - genre path** (around line 1304, after line 1308):
```sql
-- Add after existing tagSlug filter, before closing ),
```

**fetchForYou() - no genre path** (around line 1418, after line 1422):
```sql
-- Add after existing tagSlug filter, before closing ),
```

### 2. Parse New Query Parameters in Handler
In `handler()` function (around line 1550), add after `tagAny`:
```typescript
const blockedTagsRaw = typeof req.query.blockedTags === "string" ? req.query.blockedTags : null;
const blockedTags = blockedTagsRaw ? blockedTagsRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0) : null;
const formatSlug = typeof req.query.format === "string" ? req.query.format : null;
const audienceSlug = typeof req.query.audience === "string" ? req.query.audience : null;
const domainSlug = typeof req.query.domain === "string" ? req.query.domain : null;
const supergenreSlug = typeof req.query.supergenre === "string" ? req.query.supergenre : null;
```

### 3. Pass Parameters to handleBrowse
In `handler()` around line 1561, update the params:
```typescript
const books = await handleBrowse(sql, {
  algo,
  userId,
  genre,
  genreSlug,
  subgenreSlug,
  tagSlug,
  limit,
  offset,
  tagAny,
  blockedTags,
  formatSlug,
  audienceSlug,
  domainSlug,
  supergenreSlug,
});
```

### 4. Update Client API
File: `client/src/lib/api.ts`
Add to `fetchBrowseBooks` parameters and pass to URLSearchParams

### 5. Update BrowsePage to Send Filters
File: `client/src/pages/BrowsePage.tsx`
Update `useBrowseCarousel` to extract and send blockedTagSlugs, formatSlug, audienceSlug from category config

## SQL Filter Template
Copy this block to each location listed above:
```sql
-- Block filter: exclude books with blocked tags
AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
  SELECT 1 FROM book_cross_tags bct
  JOIN cross_tags ct ON ct.id = bct.cross_tag_id
  WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
))
-- Domain filter
AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
  SELECT 1 FROM book_primary_subgenres bps
  JOIN subgenres sg ON sg.id = bps.subgenre_id
  JOIN genres g ON g.id = sg.genre_id
  JOIN domains d ON d.id = g.domain_id
  WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
))
-- Supergenre filter
AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
  SELECT 1 FROM book_primary_subgenres bps
  JOIN subgenres sg ON sg.id = bps.subgenre_id
  JOIN genres g ON g.id = sg.genre_id
  JOIN supergenres sp ON sp.id = g.supergenre_id
  WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
))
-- Format filter  
AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
  SELECT 1 FROM book_formats bf
  JOIN formats f ON f.id = bf.format_id
  WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
))
-- Audience filter
AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
  SELECT 1 FROM book_age_markets bam
  JOIN age_markets am ON am.id = bam.age_market_id
  WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
))
```

## Testing Checklist
- [ ] Block tag excludes books correctly
- [ ] Domain filter works
- [ ] Supergenre filter works  
- [ ] Format filter works
- [ ] Audience filter works
- [ ] Filters combine correctly (AND logic)
- [ ] UI saves and loads all filter types
- [ ] Carousel displays blocked items as red strikethrough
- [ ] Content flags only show in Content Flags section (not Tags)
