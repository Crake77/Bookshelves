# Vercel Functions Reduction (Hobby Plan Limit)

Context: Vercel Hobby allows up to 12 Serverless Functions per deployment. Any `api/*.ts` file is treated as a function, including helper modules. We reduced function count without changing functionality by relocating helper modules out of the `api/` folder.

Changes made
- Moved helper modules out of `api/` so they are no longer deployed as functions:
  - api/_db.ts → server/lib/api-db.ts
  - api/user-books/db.ts → server/lib/user-books-db.ts
  - api/user-books/seed-data.ts → server/lib/user-books-seed-data.ts

Updated imports
- api/ingest.ts
  - from `./user-books/db.js` → `../server/lib/user-books-db.js`
- api/custom-shelves/[userId].ts
  - from `../user-books/db.js` → `../../server/lib/user-books-db.js`
- api/db-test.ts
  - from `./_db` → `../server/lib/api-db.js`
- server/lib/user-books-db.ts
  - from `./seed-data.js` → `./user-books-seed-data.js`

Why this is safe
- We didn’t remove any routes.
- Only moved internal helper code used by routes.
- All endpoints keep the same URL and behavior.

How to revert (if needed)
1. Move files back to their original locations:
   - server/lib/api-db.ts → api/_db.ts
   - server/lib/user-books-db.ts → api/user-books/db.ts
   - server/lib/user-books-seed-data.ts → api/user-books/seed-data.ts
2. Restore previous import paths in the files listed above.

Notes
- If you later migrate to a Pro plan, this change can remain as-is; it’s generally cleaner to keep helpers out of the `api/` folder.
- If additional helper modules are added in the future, place them under `server/lib/` or `shared/` to avoid counting them as functions.
