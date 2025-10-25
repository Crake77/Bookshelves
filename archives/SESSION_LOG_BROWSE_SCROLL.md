# Session Log: Browse Page Infinite Scroll & Vercel Deployment

**Date:** 2025-10-22  
**Goal:** Fix infinite scroll on browse page Fiction/Romance carousels and enable Playwright testing on Vercel

---

## Summary

### What We Accomplished
1. ✅ Updated `BrowsePage.tsx` to use `browseWorks` endpoint for top-level browsing (no filters)
2. ✅ Kept genre-specific carousels (Fiction, Romance) using old `fetchBrowseBooks` endpoint
3. ✅ Fixed Vercel 12-function limit issue by moving individual API handlers out of `/api` directory
4. ✅ Created single `/api/index.ts` serverless function to handle all routes
5. ✅ Added Playwright tests for browse scroll functionality

### What Still Needs Work
1. ❌ Vercel deployment returns 404 - Express app not routing correctly in serverless environment
2. ❌ Cannot verify infinite scroll is working without working deployment
3. ⚠️ TypeScript errors in `server/lib/editions-api.ts` (non-blocking but should be fixed)

---

## Code Changes

### 1. Browse Page Updates (`client/src/pages/BrowsePage.tsx`)

**Key Change:** Modified `useBrowseCarousel` hook to conditionally use `browseWorks` endpoint

```typescript
// Use works endpoint ONLY for the top-level browse (no filters at all)
// Genre, subgenre, tags etc all use the old endpoint for now
const hasAnyFilters = Boolean(
  genre || subgenre || tag || (tagAny && tagAny.length > 0) || 
  (blockedTags && blockedTags.length > 0) || format || 
  audience || domain || supergenre
);

const useWorksEndpoint = !hasAnyFilters;
```

**Rationale:** 
- `browseWorks` endpoint doesn't support genre filtering yet
- Treating genre as a filter ensures Fiction/Romance carousels continue working
- Top-level "Most Popular" carousel can use new works endpoint for deduplicated results

**Data Normalization:**
```typescript
const rawBooks = useMemo(() => {
  const flat = (data?.pages ?? []).flat();
  // Normalize Work objects to BookSearchResult for component compatibility
  return flat.map(item => {
    if ('displayEditionId' in item) {
      const work = item as Work;
      return {
        googleBooksId: work.googleBooksId || work.displayEditionId,
        title: work.title,
        authors: work.authors,
        // ... other fields
      } as BookSearchResult;
    }
    return item as BookSearchResult;
  });
}, [data]);
```

---

## Vercel Deployment Architecture

### Problem Discovered
Vercel was auto-detecting ALL TypeScript files in `/api` directory and creating separate serverless functions for each, exceeding the 12-function limit on Hobby plan.

**Original Structure:**
```
/api
  ├── book-taxonomy.ts    (Function 1)
  ├── browse.ts           (Function 2)
  ├── ingest.ts           (Function 3)
  ├── monitor.ts          (Function 4)
  ├── notes.ts            (Function 5)
  ├── search.ts           (Function 6)
  ├── taxonomy-list.ts    (Function 7)
  └── index.ts            (Function 8)
= 8 functions detected, but more exist elsewhere
```

### Solution Implemented
1. **Moved individual handlers** out of `/api` to `/server/api-handlers`
2. **Created single entry point** at `/api/index.ts` to handle all routes
3. **Updated `vercel.json`:**

```json
{
  "buildCommand": "npm run build",
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/index" }
  ]
}
```

### `/api/index.ts` Structure
```typescript
import express, { type Express } from "express";
import path from "path";

let app: Express | null = null;

async function getApp(): Promise<Express> {
  if (app) return app;
  
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Import and register routes dynamically
  const { registerRoutes } = await import("../server/routes.js");
  await registerRoutes(app);

  // Serve static files
  const { serveStatic } = await import("../server/vite.js");
  serveStatic(app);
  
  const clientDir = path.join(__dirname, "..", "dist", "public");
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
  
  return app;
}

export default async function handler(req: any, res: any) {
  const expressApp = await getApp();
  return expressApp(req, res);
}
```

**Result:** Only 1 serverless function counted ✅

---

## Current Deployment Issue

### Symptoms
- Build succeeds: "Deployment completed"
- All routes return 404: "NOT_FOUND"
- Both `/browse` and `/api` endpoints fail

### Potential Causes
1. **Express-Vercel mismatch:** Express `app(req, res)` might not work with Vercel's request/response format
2. **Static file serving:** `res.sendFile()` might not work in serverless context
3. **Async initialization:** `registerRoutes` is async and might not complete before first request
4. **Path resolution:** `__dirname` and relative paths might not resolve correctly in Vercel's build output

### Files Moved (for reference)
```bash
api/book-taxonomy.ts    → server/api-handlers/book-taxonomy.ts
api/browse.ts           → server/api-handlers/browse.ts
api/ingest.ts           → server/api-handlers/ingest.ts
api/monitor.ts          → server/api-handlers/monitor.ts
api/notes.ts            → server/api-handlers/notes.ts
api/search.ts           → server/api-handlers/search.ts
api/taxonomy-list.ts    → server/api-handlers/taxonomy-list.ts
```

---

## TypeScript Errors (Non-blocking)

### `server/lib/editions-api.ts`
```
Line 166: Argument of type 'boolean' is not assignable to parameter of type 'SQLWrapper'
Line 180: Same error
Line 327: Type mismatch in release event insertion
```

These errors are in the publication dating system we deployed earlier. They don't block deployment but should be fixed.

---

## Testing Setup

### Playwright Tests Created
**File:** `tests/browse-scroll.spec.ts`

**Tests:**
1. Fiction carousel infinite scroll
2. Romance carousel infinite scroll  
3. Debug test to inspect page content

**Configuration:** Uses `BASE_URL` environment variable

**Usage:**
```bash
$env:BASE_URL='https://your-url.vercel.app'
npx playwright test tests/browse-scroll.spec.ts
```

---

## Next Steps

### Option 1: Fix Vercel Deployment (Recommended for GPT Research)
**Questions to research:**
1. How to properly wrap Express apps for Vercel serverless functions?
2. Does Vercel support SPA routing + API routes in single function?
3. Should we use `@vercel/node` or different build approach?
4. Examples of Express monorepo deployed to Vercel Hobby plan?

**Resources:**
- Vercel Express.js documentation
- Community examples of Express + Vite on Vercel
- Serverless Express patterns

### Option 2: Test Locally
The browse page changes are ready. To test:
```bash
npm run dev
# Navigate to http://localhost:5173/browse
# Scroll Fiction/Romance carousels to trigger pagination
```

### Option 3: Alternative Deployment
Consider platforms that better support Express apps:
- Railway
- Render  
- Fly.io
- Heroku

---

## API Endpoints Status

### Working Endpoints (in routes.ts)
- ✅ `/api/search` - Book search
- ✅ `/api/browse` - Browse books (old endpoint with filtering)
- ✅ `/api/works/browse` - Browse works (new endpoint, no genre filter yet)
- ✅ `/api/works/:id` - Get work details
- ✅ `/api/works/:id/editions` - Get work editions
- ✅ All user-books endpoints
- ✅ All taxonomy endpoints

### Serverless Function Count
**Current:** 1 (only `/api/index.ts`)  
**Limit:** 12 (Vercel Hobby plan)  
**Status:** ✅ Under limit

---

## Files Changed This Session

```
client/src/lib/api.ts                    - Added browseWorks import
client/src/pages/BrowsePage.tsx          - Updated useBrowseCarousel hook
api/index.ts                             - Created serverless entry point
vercel.json                              - Updated routing config
tests/browse-scroll.spec.ts              - Created Playwright tests
server/api-handlers/*                    - Moved from /api directory
```

---

## Known Issues

1. **Vercel 404 on all routes** - Primary blocker
2. **TypeScript errors in editions-api.ts** - Should be fixed
3. **Cannot test infinite scroll** - Blocked by #1
4. **No confirmation if Fiction/Romance have enough data** - May need database check

---

## Questions for Next Session

1. Do Fiction/Romance genres have enough books (>12) in the database to test pagination?
2. Should we add genre filtering support to `browseWorks` endpoint?
3. Is there a working production URL we can test against?
4. Should we consider alternative deployment platforms?

---

**End of Log**
