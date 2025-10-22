# Frontend UI Implementation Plan - Publication Dating System

## Overview
This plan outlines the step-by-step frontend implementation to surface the publication dating system (works/editions/events) to users.

## Phase 1: Fix Carousel Issues & Add Basic Date Display

### Step 1.1: Debug Carousel Infinite Scroll (IMMEDIATE)
**Problem:** Second carousel only shows a few titles, infinite scroll broken
**Root Cause:** Browse endpoint returns books-based data, not works
**Fix:**
- Check if `/api/browse` is still being used vs `/api/works/browse`
- Verify pagination parameters match works endpoint
- Ensure deduplication isn't causing short pages

**Files to Check:**
- `client/src/pages/BrowsePage.tsx` - carousel data fetching
- `api/browse.ts` - current browse implementation
- `client/src/lib/api.ts` - API client calls

**Test:**
- Verify at least 12 items per page
- Scroll through 3+ pages
- Check network tab for correct endpoint

---

### Step 1.2: Add Publication Date to Book Detail Dialog
**Location:** Below page count, near middle widget
**Data Source:** Work's `originalPublicationDate` or `latestMajorReleaseDate`
**Format:** "Published: 2024" or "Published: March 2024" (if month available)

**Implementation:**
```tsx
// In BookDetailDialog.tsx, middle widget section (line ~586)
<div className="flex items-center justify-center text-xs text-muted-foreground">
  {book.publishedDate ? `Published: ${formatPublishedDate(book.publishedDate)}` : 
   book.pageCount ? `${book.pageCount} pages` : "—"}
</div>
```

**Format Function:**
```typescript
function formatPublishedDate(date: string | Date): string {
  // "1965-08-01" → "August 1965"
  // "2024" → "2024"
  // "2024-03-15" → "March 2024"
}
```

**Files to Modify:**
- `client/src/components/BookDetailDialog.tsx` (lines 586-588)
- Add utility to `client/src/lib/utils.ts`

---

## Phase 2: Edition Selector UI

### Step 2.1: Add Pencil Icon to Book Cover
**Location:** Top-right corner of book cover image
**Style:** Small pencil icon (Edit3 from lucide-react), similar to taxonomy filter icons
**Behavior:** Only show if work has multiple editions

**Implementation:**
```tsx
// Wrap cover image in relative container
<div className="relative">
  <img src={book.coverUrl} alt={book.title} className="..." />
  {hasMultipleEditions && (
    <button
      className="absolute -top-2 -right-2 p-1.5 bg-background rounded-full border border-border shadow-lg hover:bg-primary/10 transition-colors"
      onClick={() => setShowEditions(true)}
      aria-label="View all editions"
    >
      <Edit3 className="h-3.5 w-3.5 text-primary" />
    </button>
  )}
</div>
```

**Files to Modify:**
- `client/src/components/BookDetailDialog.tsx` (lines 507-514)

---

### Step 2.2: Fetch Work and Editions Data
**Trigger:** When dialog opens with a book
**Flow:**
1. Check if `googleBooksId` maps to a work (new API call)
2. If work exists, fetch editions: `GET /api/works/:workId/editions`
3. Store in component state

**New API Functions:**
```typescript
// In client/src/lib/api.ts
export async function getWorkByGoogleBooksId(googleBooksId: string) {
  // Query: SELECT works.* FROM works 
  //        JOIN editions ON editions.work_id = works.id 
  //        WHERE editions.google_books_id = ?
  const res = await fetch(`/api/works/by-google-books-id/${googleBooksId}`);
  return res.json();
}

export async function getWorkEditions(workId: string) {
  const res = await fetch(`/api/works/${workId}/editions`);
  return res.json();
}
```

**Server Route to Add:**
```typescript
// In server/routes.ts
app.get("/api/works/by-google-books-id/:googleBooksId", async (req, res) => {
  const { googleBooksId } = req.params;
  const [work] = await db
    .select({ id: works.id, ...works })
    .from(works)
    .innerJoin(editions, eq(editions.workId, works.id))
    .where(eq(editions.googleBooksId, googleBooksId))
    .limit(1);
  
  if (!work) return res.status(404).json({ error: "Work not found" });
  res.json(work);
});
```

**Files to Modify:**
- `client/src/lib/api.ts` - Add new API functions
- `server/routes.ts` - Add lookup route
- `client/src/components/BookDetailDialog.tsx` - Add useQuery hooks

---

### Step 2.3: Create Editions Carousel Component
**Component:** `EditionsCarousel.tsx`
**Style:** Bottom sheet modal (similar to rating keypad)
**Layout:**
- Title: "Select Cover" or "Available Editions"
- Horizontal scrollable carousel of cover images
- Each cover shows: image, publication date, edition statement (if any)
- Selected cover has blue border
- "Use This Cover" button at bottom

**Visual Design:**
```
┌─────────────────────────────┐
│     Available Editions      │ ← Title
├─────────────────────────────┤
│                             │
│  [Cover1]  [Cover2] [Cover3]│ ← Horizontal scroll
│   1965      2021      2023  │    with dates
│  Original   Movie    Audio  │    and statements
│              Tie-in          │
│                             │
├─────────────────────────────┤
│    [Use This Cover]         │ ← Action button
└─────────────────────────────┘
```

**Implementation:**
```tsx
// New file: client/src/components/EditionsCarousel.tsx
interface EditionsCarouselProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editions: Edition[];
  selectedEditionId: string;
  onSelectEdition: (editionId: string) => void;
}

export default function EditionsCarousel({...}: EditionsCarouselProps) {
  return (
    <>
      <div className="absolute inset-0 bg-background/50" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="bg-background rounded-t-3xl border-t shadow-2xl p-6" style={{ height: '60vh' }}>
          <h3 className="text-center font-semibold mb-4">Available Editions</h3>
          
          <div className="overflow-x-auto flex gap-4 pb-4">
            {editions.map(edition => (
              <div
                key={edition.id}
                className={cn(
                  "flex-shrink-0 cursor-pointer transition-all",
                  selectedEditionId === edition.id ? "ring-2 ring-primary" : ""
                )}
                onClick={() => onSelectEdition(edition.id)}
              >
                <img src={edition.coverUrl} className="w-32 h-48 rounded-lg object-cover" />
                <p className="text-xs text-center mt-2">
                  {formatYear(edition.publicationDate)}
                </p>
                {edition.editionStatement && (
                  <p className="text-xs text-muted-foreground text-center truncate w-32">
                    {edition.editionStatement}
                  </p>
                )}
              </div>
            ))}
          </div>
          
          <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>
            Use This Cover
          </Button>
        </div>
      </div>
    </>
  );
}
```

**Files to Create:**
- `client/src/components/EditionsCarousel.tsx`

---

### Step 2.4: Integrate Edition Selection
**Behavior:**
- When user selects edition, update displayed cover
- Update publication date shown
- Optionally: save preference to localStorage or user preferences table

**State Management:**
```tsx
// In BookDetailDialog.tsx
const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
const [showEditions, setShowEditions] = useState(false);

const displayedEdition = selectedEditionId 
  ? editions?.find(e => e.id === selectedEditionId)
  : editions?.[0]; // Default to first (latest major)

// Use displayedEdition.coverUrl instead of book.coverUrl
// Use displayedEdition.publicationDate for display
```

**Files to Modify:**
- `client/src/components/BookDetailDialog.tsx` - Add edition state and selection logic

---

## Phase 3: Switch Browse to Works Endpoint

### Step 3.1: Update Browse API Client
**Change:** Switch from `/api/browse` to `/api/works/browse`
**Benefits:**
- Automatic deduplication (show 1 Dune, not 20)
- Access to computed dates (latestMajorReleaseDate)
- Edition-aware browsing

**Implementation:**
```typescript
// In client/src/lib/api.ts
export async function browseWorks(params: {
  sort?: 'original' | 'latestMajor' | 'latestAny' | 'title';
  recentDays?: number;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams({
    sort: params.sort || 'latestMajor',
    recentDays: params.recentDays?.toString() || '90',
    limit: params.limit?.toString() || '12',
    offset: params.offset?.toString() || '0',
  });
  
  const res = await fetch(`/api/works/browse?${query}`);
  return res.json();
}
```

**Files to Modify:**
- `client/src/lib/api.ts` - Add browseWorks function
- `client/src/pages/BrowsePage.tsx` - Switch to browseWorks

---

### Step 3.2: Update Book Card to Show Works Data
**Changes:**
- Use `work.coverUrl` (from display edition)
- Show `work.latestMajorReleaseDate` instead of `book.publishedDate`
- Handle work → edition mapping

**Type Updates:**
```typescript
// Add to client/src/lib/api.ts
export interface Work {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  series: string | null;
  seriesOrder: number | null;
  originalPublicationDate: string | null;
  latestMajorReleaseDate: string | null;
  latestAnyReleaseDate: string | null;
  displayEditionId: string;
  coverUrl: string;
}
```

**Files to Modify:**
- `client/src/lib/api.ts` - Add Work interface
- `client/src/components/BookCard.tsx` - Handle Work type
- `client/src/pages/BrowsePage.tsx` - Use Work type

---

### Step 3.3: Add Sort Options to Browse
**UI:** Dropdown or tabs for sorting
**Options:**
- "Recently Released" (latestMajor, last 90 days)
- "Latest Editions" (latestAny)
- "Original Publication" (original)
- "Title A-Z" (title)

**Implementation:**
```tsx
// In BrowsePage.tsx header
<Select value={sortMode} onValueChange={setSortMode}>
  <SelectTrigger className="w-48">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="latestMajor">Recently Released</SelectItem>
    <SelectItem value="latestAny">Latest Editions</SelectItem>
    <SelectItem value="original">Original Publication</SelectItem>
    <SelectItem value="title">Title A-Z</SelectItem>
  </SelectContent>
</Select>
```

**Files to Modify:**
- `client/src/pages/BrowsePage.tsx` - Add sort selector

---

## Phase 4: Advanced Features (Future)

### Step 4.1: User Cover Preferences
- Save user's selected edition per work
- Store in localStorage or user preferences table
- Apply preference across all app views

### Step 4.2: Publication History Timeline
- Show all release events for a work
- Visual timeline with event types and dates
- Highlight movie tie-ins, anniversaries

### Step 4.3: Series Page
- Group works by series
- Show in series order
- Display consistent covers per user preference

---

## Testing Checklist

### Phase 1
- [ ] Carousel scrolls infinitely (3+ pages)
- [ ] Publication date shows in dialog
- [ ] Date formats correctly (year, month+year)

### Phase 2
- [ ] Pencil icon appears on covers with multiple editions
- [ ] Clicking pencil opens editions carousel
- [ ] Selecting edition updates cover and date
- [ ] "Use This Cover" closes carousel

### Phase 3
- [ ] Browse shows deduplicated works
- [ ] Dune appears once, not multiple times
- [ ] Sort options work correctly
- [ ] Recently Released shows movie tie-ins

### Phase 4
- [ ] User preferences persist across sessions
- [ ] Timeline shows all events
- [ ] Series page groups correctly

---

## Implementation Order

**Week 1 (Immediate):**
1. ✅ Fix carousel scroll (Step 1.1) - TODAY
2. Add publication date display (Step 1.2)
3. Add pencil icon (Step 2.1)

**Week 2:**
4. Fetch work/editions data (Step 2.2)
5. Build editions carousel (Step 2.3)
6. Integrate selection (Step 2.4)

**Week 3:**
7. Switch browse endpoint (Step 3.1)
8. Update types and cards (Step 3.2)
9. Add sort options (Step 3.3)

**Future:**
10. Advanced features (Phase 4)

---

## Notes
- All changes maintain backward compatibility
- Old books endpoint can remain for legacy support
- Edition selection is optional (defaults to latest major)
- Works without editions show as single entry
