# Browse Infinite Scroll — What Fixed It and Why

Context: Browse carousels stopped loading more items. Two issues compounded:

1) Client paging logic advanced the offset by the length of the last page. If the API returned fewer than the page size, the client assumed “end of data” and never requested more.
2) `/api/browse` (popular mode) sometimes returned fewer than a full page, and later failed entirely with a 500 due to taxonomy link tables missing when EXISTS filters were parsed.

What we changed
- Client (offset paging):
  - File: `client/src/pages/BrowsePage.tsx`
  - `getNextPageParam` now advances by the fixed page size (12) only when the last page length equals the page size. If fewer items are returned, paging stops correctly.
- Server (ensure full pages + prevent 500s):
  - File: `api/browse.ts`
    - popular mode now “tops up” results with remote Google Books volumes to meet the requested page size when the DB returns fewer.
    - Added optional debug info in 500 responses (preview only) to quickly surface root causes during testing.
  - File: `api/taxonomy-seed.ts`
    - Creates taxonomy link tables (`book_primary_subgenres`, `book_subgenre_candidates`, `book_cross_tags`, `book_age_markets`) so browse filters referencing them won’t error.

What not to break going forward
- Keep `CAROUSEL_PAGE_SIZE` consistent across client and API expectations (currently 12 on the client).
- If you add taxonomy-aware filters to more browse modes (rating/recent), ensure the link tables exist (done in `api/taxonomy-seed.ts`) and keep the same top‑up logic if you need consistently full pages.
- Don’t revert the client `getNextPageParam` logic to lastPage.length > 0; it will reintroduce stalled paging when short pages occur.

Symptoms to look for
- Carousels stuck at 2–4 items: inspect `/api/browse?...&limit=12&offset=0` for 500s or short pages; check DB seed and link tables.
- 500 with `relation "book_primary_subgenres" does not exist`: run taxonomy seed endpoint once on preview.

How to (re)seed on preview
- `curl -X POST https://<preview>.vercel.app/api/taxonomy-seed`

Rollback plan
- Client change is localized to `useInfiniteQuery` paging. Revert only if you also change the API to always return full pages.
- The link-table creation in `api/taxonomy-seed.ts` is idempotent and safe to keep.

Follow-ups / TODO
- Cover/Title mismatches: add a normalization pipeline to ensure the displayed cover matches the returned title/author.
  - Prefer Google Books imageLinks for the exact volume; fall back only if no Google cover is available.
  - Add a lightweight verifier (title/author string similarity) and a re-fetch step for suspect cover/title pairs.
  - Provide a one-off endpoint to refresh covers for a given `googleBooksId` when mismatches are reported.
