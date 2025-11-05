# Series Filter Implementation Plan

**Created:** 2025-11-05  
**Status:** 🔴 Temporarily Disabled (SQL Syntax Error)  
**Priority:** HIGH - Required for series metadata feature to function

## Problem Summary

The series filter was implemented but caused SQL syntax errors in production (`"syntax error at or near \"$21\""`). The filter was temporarily disabled to restore the browse API functionality.

### Root Cause

**Nested SQL Template Literals Issue:**
- Drizzle-orm's `sql` template literals don't handle nested conditionals well
- When we tried: `${params.seriesPosition === true ? sql`AND w.series_order IS NOT NULL` : sql``}` inside another `sql` template, it caused parameter binding issues
- The nested template creates incorrect SQL parameter numbering

### Error Details

```
Error: "syntax error at or near \"$21\""
Location: All browse query functions (fetchPopular, fetchHighestRated, fetchRecentlyAdded, fetchForYou)
Status: HasDbUrl: true (database connection is fine)
```

## Current State

### What's Working ✅
- Browse API returns 20 books correctly
- All other filters work (genre, subgenre, tag, format, audience, author, domain, supergenre)
- Series metadata UI is implemented and displays correctly
- Series info API endpoint works (`/api/books/:id/series-info`)

### What's Broken ❌
- Series filtering is completely disabled in all browse queries
- Clicking series name in BookSeriesMetadata doesn't filter books
- Clicking series position doesn't filter to main sequence only

## Requirements

### Series Filter Logic

1. **Filter by Series Name:**
   - When `params.series` is provided, filter books to only those in that series
   - Series matching: `LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series})`
   - Join path: `books` → `editions` (via `legacy_book_id`) → `works` (via `work_id`)

2. **Filter by Series Position (Optional):**
   - When `params.seriesPosition === true`, additionally filter to only main sequence books
   - Condition: `w.series_order IS NOT NULL`
   - This excludes prequels, add-ons, and other non-main-sequence books

3. **No Filter:**
   - When `params.series` is null/undefined, don't apply any series filter
   - Don't add any SQL clauses related to series

## Solution Approaches

### Approach 1: Pre-build SQL Fragments (RECOMMENDED)

**Strategy:** Build the series filter SQL fragment conditionally BEFORE the main query, then interpolate it as a single fragment.

```typescript
// Build series filter fragment BEFORE the main query
let seriesFilterFragment: ReturnType<typeof sql>;

if (params.series) {
  if (params.seriesPosition === true) {
    seriesFilterFragment = sql`AND EXISTS (
      SELECT 1 FROM editions e
      JOIN works w ON w.id = e.work_id
      WHERE e.legacy_book_id = b.id
        AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series})
        AND w.series_order IS NOT NULL
    )`;
  } else {
    seriesFilterFragment = sql`AND EXISTS (
      SELECT 1 FROM editions e
      JOIN works w ON w.id = e.work_id
      WHERE e.legacy_book_id = b.id
        AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series})
    )`;
  }
} else {
  seriesFilterFragment = sql``; // Empty fragment
}

// Then use in main query
const queryResult = await sql`
  SELECT ...
  FROM books b
  WHERE ...
  ${seriesFilterFragment}
  ORDER BY ...
`;
```

**Pros:**
- No nested templates
- Clean separation of concerns
- Easy to understand and maintain
- Works with drizzle-orm's parameter binding

**Cons:**
- Requires building the fragment before the query
- Slightly more verbose

### Approach 2: Separate Query Functions

**Strategy:** Create separate query functions for series vs non-series queries.

```typescript
async function fetchPopularWithSeries(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  // Query with series filter
}

async function fetchPopularWithoutSeries(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  // Query without series filter
}

// Then in fetchPopular:
if (params.series) {
  return fetchPopularWithSeries(sql, params);
} else {
  return fetchPopularWithoutSeries(sql, params);
}
```

**Pros:**
- No nested templates at all
- Very clear separation

**Cons:**
- Code duplication (4 query functions × 2 variants = 8 functions)
- Harder to maintain
- More complex

### Approach 3: Use SQL String Concatenation (NOT RECOMMENDED)

**Strategy:** Build SQL as strings and use `sql.raw()`.

```typescript
let seriesFilterClause = '';
if (params.series) {
  seriesFilterClause = params.seriesPosition === true
    ? 'AND EXISTS (SELECT 1 FROM editions e JOIN works w...) AND w.series_order IS NOT NULL'
    : 'AND EXISTS (SELECT 1 FROM editions e JOIN works w...)';
}

const queryResult = await sql`SELECT ... WHERE ... ${sql.raw(seriesFilterClause)}`;
```

**Pros:**
- Simple conditional logic

**Cons:**
- SQL injection risk if not careful
- Lose type safety
- `sql.raw()` doesn't exist in drizzle-orm (we tried this, got error)

## Recommended Implementation (Approach 1)

### Step-by-Step Implementation

1. **Update `fetchPopular` function:**
   ```typescript
   async function fetchPopular(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
     const genre = normalizeGenre(params.genre);
     const genrePattern = buildGenrePattern(genre);
     
     // Build series filter fragment BEFORE query
     const seriesFilter = params.series
       ? params.seriesPosition === true
         ? sql`AND EXISTS (
               SELECT 1 FROM editions e
               JOIN works w ON w.id = e.work_id
               WHERE e.legacy_book_id = b.id
                 AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series})
                 AND w.series_order IS NOT NULL
             )`
         : sql`AND EXISTS (
               SELECT 1 FROM editions e
               JOIN works w ON w.id = e.work_id
               WHERE e.legacy_book_id = b.id
                 AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series})
             )`
       : sql``;
     
     // Use in main query
     const queryResult = genre
       ? await sql`SELECT ... WHERE ... ${seriesFilter} ORDER BY ...`
       : await sql`SELECT ... WHERE ... ${seriesFilter} ORDER BY ...`;
   }
   ```

2. **Apply to all query functions:**
   - `fetchPopular`
   - `fetchHighestRated`
   - `fetchRecentlyAdded`
   - `fetchForYou`

3. **Test each function:**
   - Test without series filter
   - Test with series filter (no position)
   - Test with series filter + position filter

### Files to Modify

1. `server/api-handlers/browse.ts`
   - `fetchPopular` function (lines ~428-720)
   - `fetchHighestRated` function (lines ~722-1043)
   - `fetchRecentlyAdded` function (lines ~1045-1386)
   - `fetchForYou` function (lines ~1428-1820)

### Testing Plan

1. **Local Testing:**
   ```bash
   # Test browse without series filter
   curl "http://localhost:8001/api/browse?algo=popular&limit=20"
   
   # Test browse with series filter
   curl "http://localhost:8001/api/browse?algo=popular&limit=20&series=wheel-of-time"
   
   # Test browse with series + position filter
   curl "http://localhost:8001/api/browse?algo=popular&limit=20&series=wheel-of-time&seriesPosition=true"
   ```

2. **Production Testing:**
   - Deploy to preview first
   - Test series filter in UI (click series name in BookSeriesMetadata)
   - Test series position filter (click "Book X of Y")
   - Verify no SQL errors in Vercel logs

3. **Edge Cases:**
   - Books with no series
   - Books with series but no `series_order`
   - Books in multiple series (shouldn't happen, but test)
   - Empty series slug

## Database Schema Reference

### Relevant Tables

```sql
-- Books table (legacy)
books (
  id UUID PRIMARY KEY,
  google_books_id TEXT,
  ...
)

-- Editions table (FRBR-lite)
editions (
  id UUID PRIMARY KEY,
  legacy_book_id UUID REFERENCES books(id),
  work_id UUID REFERENCES works(id),
  ...
)

-- Works table (FRBR-lite)
works (
  id UUID PRIMARY KEY,
  series TEXT,  -- Series name (e.g., "Wheel of Time")
  series_order INTEGER,  -- Position in main sequence (NULL for prequels/add-ons)
  ...
)
```

### Join Path

```
books (b)
  ↓ legacy_book_id
editions (e)
  ↓ work_id
works (w)
  → w.series (series name)
  → w.series_order (position, NULL if not main sequence)
```

## Rollback Plan

If the implementation causes issues:

1. **Immediate:** Comment out the series filter fragment again
2. **Deploy:** Push the rollback commit
3. **Document:** Update this file with the specific error encountered

## Success Criteria

✅ Series filter works without SQL errors  
✅ Books can be filtered by series name  
✅ Books can be filtered by series + position (main sequence only)  
✅ No performance degradation  
✅ All browse algorithms (popular, rating, recent, for-you) support series filtering  
✅ UI interactions (clicking series name/position) work correctly  

## Notes

- The series filter was working in `fetchHighestRated` initially (line 955), but it used `null` instead of `sql`` which caused serialization errors
- We tried multiple approaches (`sql`AND TRUE``, `sql``, `sql.raw()`, nested conditionals) - none worked
- The key insight: **Build SQL fragments BEFORE the main query, not inside it**

## Related Files

- `server/api-handlers/browse.ts` - Main implementation
- `client/src/components/BookSeriesMetadata.tsx` - UI component
- `client/src/lib/api.ts` - API client functions
- `client/src/components/TaxonomyListDialog.tsx` - Filter dialog
- `server/routes.ts` - Series info API endpoint

---

**Next Steps:**
1. Implement Approach 1 (pre-build SQL fragments)
2. Test locally
3. Deploy to preview
4. Test in production UI
5. Update this document with results

