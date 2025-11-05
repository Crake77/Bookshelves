# Cover Edition Info & Series Metadata Implementation Plan

## Overview
This plan covers two features:
1. **Cover Edition Information Display** - Show edition details in the cover carousel popup
2. **Series Metadata Section** - Display series name and position with clickable filters

---

## Part 1: Cover Edition Information in Popup

### Goal
Display edition metadata (format, edition statement, publication date, market) in the cover carousel popup so users can see which edition each cover represents.

### Requirements
- Edition info should ONLY appear in the carousel popup
- Once user selects a cover, only the image is shown (no metadata clutter)
- Info should be clear and readable

### Implementation Steps

#### 1.1 Update CoverCarouselDialog Component
**File**: `client/src/components/CoverCarouselDialog.tsx`

- Add edition metadata display below each cover image
- Show:
  - Format (e.g., "Hardcover", "Paperback")
  - Edition Statement if available (e.g., "10th Anniversary", "Movie Tie-In")
  - Publication Date (formatted: "Published 2024" or "Published March 2024")
  - Market if available (e.g., "US", "UK")
- Style: Small, readable text below the format badge
- Only visible in carousel, not persisted after selection

#### 1.2 Edition Data Structure
**File**: `client/src/lib/api.ts`

- `Edition` interface already includes:
  - `format: string`
  - `editionStatement: string | null`
  - `publicationDate: string | null`
  - `market: string | null`
- No changes needed - data is already available

#### 1.3 UI Design
- Format badge: Already exists at bottom of cover
- Edition metadata: Add below format badge or as overlay
- Consider: Tooltip on hover, or always visible below image
- Recommendation: Always visible in carousel for clarity

---

## Part 2: Series Metadata Section

### Goal
Display series information (name + position) with clickable filters that work like tags/genres/subgenres.

### Requirements
- Show series name (e.g., "Wheel of Time")
- Show series position if book is part of main sequence (e.g., "Book 1 of 15")
- Hide series position if book is prequel/add-on (seriesOrder = null)
- Both clicks open TaxonomyListDialog with appropriate filters
- Use existing filter infrastructure

### Data Model

#### 2.1 Database Schema (Already Exists)
**Table**: `works`
- `series: text | null` - Series name
- `seriesOrder: integer | null` - Position in series (1, 2, 3...)
- `id: uuid` - Work ID

**Logic**:
- If `seriesOrder` is NOT null → Book is part of main sequence
- If `seriesOrder` IS null → Book is prequel/add-on (hide position)

#### 2.2 API Requirements

**New Endpoint**: `GET /api/books/:googleBooksId/series-info`
- Returns:
  ```typescript
  {
    series: string | null;
    seriesOrder: number | null;
    totalBooksInSeries: number | null; // Count of books with same series AND seriesOrder IS NOT NULL
    workId: string | null;
  }
  ```
- Query:
  1. Find edition by googleBooksId
  2. Get workId from edition
  3. Get series info from work
  4. Count total books in series (where series matches AND seriesOrder IS NOT NULL)

**File**: `server/routes.ts`
- Add endpoint after `/api/books/:googleBooksId/editions`

#### 2.3 Frontend API Function
**File**: `client/src/lib/api.ts`

```typescript
export interface SeriesInfo {
  series: string | null;
  seriesOrder: number | null;
  totalBooksInSeries: number | null;
  workId: string | null;
}

export async function getBookSeriesInfo(googleBooksId: string): Promise<SeriesInfo | null> {
  const response = await fetch(`/api/books/${googleBooksId}/series-info`);
  if (!response.ok) return null;
  return response.json();
}
```

### UI Components

#### 2.4 Series Metadata Display Component
**New File**: `client/src/components/BookSeriesMetadata.tsx`

```typescript
interface BookSeriesMetadataProps {
  series: string;
  seriesOrder: number | null;
  totalBooksInSeries: number | null;
  onSeriesClick: () => void;
  onPositionClick: () => void;
}
```

**Features**:
- Display series name as clickable badge/chip
- Display series position as clickable badge/chip (if seriesOrder exists)
- Style similar to existing taxonomy chips
- Use existing Badge component from shadcn/ui

**Layout**:
```
Series: [Wheel of Time] [Book 1 of 15]
```

If no position:
```
Series: [Wheel of Time]
```

#### 2.5 Integration with BookDetailDialog
**File**: `client/src/components/BookDetailDialog.tsx`

**Location**: Add after authors section, before stats section

**Steps**:
1. Fetch series info when book dialog opens
2. Render `BookSeriesMetadata` component if series exists
3. Handle clicks to open TaxonomyListDialog

**Code Location**: Around line 570-600 (after authors, before stats)

#### 2.6 TaxonomyListDialog Integration
**File**: `client/src/components/TaxonomyListDialog.tsx`

**New Filter Type**: `series` and `series-position`

**Filter Structure**:
```typescript
// For series name click
{ kind: "series", slug: "wheel-of-time", label: "Wheel of Time" }

// For series position click  
{ kind: "series-position", slug: "wheel-of-time", label: "Wheel of Time", seriesOrder: 1 }
```

**Backend Support**:
- Update browse API to handle `series` and `series-position` filters
- `series` filter: WHERE works.series = ?
- `series-position` filter: WHERE works.series = ? AND works.seriesOrder IS NOT NULL

#### 2.7 Browse API Updates
**File**: `server/api-handlers/browse.ts` or `server/routes.ts`

**Add Filter Support**:
- `series` parameter: Filter by series name
- `seriesPosition` parameter: Filter by series name AND require seriesOrder IS NOT NULL

**Query Logic**:
```sql
-- Series filter (all books in series)
WHERE works.series = $1

-- Series position filter (main sequence only)
WHERE works.series = $1 
  AND works.series_order IS NOT NULL
ORDER BY works.series_order
```

---

## Implementation Order

### Phase 1: Cover Edition Info (Simple)
1. ✅ Update CoverCarouselDialog to display edition metadata
2. ✅ Test in browser

### Phase 2: Series Metadata (More Complex)
1. ✅ Create API endpoint `/api/books/:googleBooksId/series-info`
2. ✅ Add `getBookSeriesInfo()` to client API
3. ✅ Create `BookSeriesMetadata` component
4. ✅ Integrate into BookDetailDialog
5. ✅ Update TaxonomyListDialog to handle series filters
6. ✅ Update browse API to support series filtering
7. ✅ Test series name click → shows all books in series
8. ✅ Test series position click → shows only main sequence books

---

## Files to Create/Modify

### New Files
- `client/src/components/BookSeriesMetadata.tsx` - Series metadata display component

### Modified Files
- `client/src/components/CoverCarouselDialog.tsx` - Add edition metadata display
- `client/src/components/BookDetailDialog.tsx` - Add series metadata section
- `client/src/components/TaxonomyListDialog.tsx` - Add series filter support
- `client/src/lib/api.ts` - Add `getBookSeriesInfo()` and `SeriesInfo` interface
- `server/routes.ts` - Add `/api/books/:googleBooksId/series-info` endpoint
- `server/api-handlers/browse.ts` or `server/routes.ts` - Add series filtering to browse API

---

## Testing Checklist

### Cover Edition Info
- [ ] Edition metadata displays in carousel popup
- [ ] Format, edition statement, date, market all show correctly
- [ ] Metadata only appears in popup (not after selection)
- [ ] Looks good on mobile and desktop

### Series Metadata
- [ ] Series name displays when book is in a series
- [ ] Series position displays when book has seriesOrder
- [ ] Position hidden when seriesOrder is null (prequel/add-on)
- [ ] Series name click opens TaxonomyListDialog with correct filter
- [ ] Series position click opens TaxonomyListDialog with correct filter
- [ ] Series filter shows all books in series
- [ ] Series position filter shows only main sequence books
- [ ] Total count in series is accurate
- [ ] Works correctly for books not in a series (nothing shows)

---

## Edge Cases to Handle

1. **Book not in series**: No series metadata section shows
2. **Series with no position**: Only series name shows (no position badge)
3. **Series with position**: Both series name and position show
4. **Multiple editions**: Series info should be consistent across editions
5. **Series name click**: Shows all books (including prequels/add-ons)
6. **Position click**: Shows only main sequence (excludes prequels/add-ons)
7. **Series name formatting**: Handle special characters, capitalization
8. **Total count**: Should only count books with seriesOrder (main sequence)

---

## UI/UX Considerations

### Cover Edition Info
- Keep metadata compact and readable
- Use consistent styling with existing format badge
- Consider tooltip for additional info if space is limited

### Series Metadata
- Match existing taxonomy chip styling for consistency
- Make it clear what each click will do
- Consider hover states to indicate clickability
- Position relative to series name should be clear (e.g., "Book 1 of 15")

---

## Completion Criteria

✅ Cover carousel shows edition metadata
✅ Series metadata section appears in BookDetailDialog
✅ Series name clickable and filters correctly
✅ Series position clickable and filters correctly (when applicable)
✅ All edge cases handled
✅ UI matches existing design system
✅ Code pushed to GitHub

