# Production Browse API Debug Guide

**Issue:** Production shows old fallback books, none of the 20 database books appear

## ✅ What We Know

1. **Database is correct:** 20 books present (verified locally)
2. **Query works locally:** Returns all 20 books correctly
3. **Book stats exist:** All 20 books have book_stats entries
4. **Frontend fallback:** Shows old books when API fails/returns empty

## 🔍 Diagnosis Steps

### Step 1: Check Vercel Logs

```bash
# View recent logs
npx vercel logs bookshelves-1f4r3as3d-john-dunhams-projects-39f6d8ce.vercel.app

# Or view in Vercel dashboard:
# https://vercel.com/john-dunhams-projects-39f6d8ce/bookshelves
```

**Look for:**
- `[browse] Returning X books` - Should show 20
- `Failed to load browse recommendations` - Error messages
- `Missing DATABASE_URL env var` - Environment variable issue

### Step 2: Test API Directly

```bash
# Test the browse API endpoint
curl "https://bookshelves-1f4r3as3d-john-dunhams-projects-39f6d8ce.vercel.app/api/browse?algo=popular&limit=20"
```

**Expected:** JSON array with 20 book objects  
**Actual:** Check what's returned

### Step 3: Verify Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Verify `DATABASE_URL` is set for **Production**
3. Check if it matches your local `.env.local` DATABASE_URL

### Step 4: Check Browser Console

1. Open production site
2. Open DevTools → Console
3. Look for:
   - `[fetchBrowseBooks] API returned empty payload, using fallback`
   - `[fetchBrowseBooks] falling back due to error`
   - Network errors to `/api/browse`

## 🔧 Possible Issues & Fixes

### Issue 1: DATABASE_URL Not Set in Vercel
**Symptom:** Logs show "Missing DATABASE_URL env var"

**Fix:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add `DATABASE_URL` with your Neon database connection string
3. Ensure it's set for **Production** environment
4. Redeploy

### Issue 2: Database Connection Failing
**Symptom:** Logs show connection errors

**Fix:**
- Verify DATABASE_URL is correct
- Check Neon database is accessible
- Verify IP allowlist (if enabled)

### Issue 3: Query Returning Empty Results
**Symptom:** Logs show `[browse] Returning 0 books`

**Possible causes:**
- Books don't have book_stats (but we verified they do)
- Filter conditions excluding all books
- Database schema mismatch

**Fix:**
- Check if query filters are too restrictive
- Verify book_stats table has data

### Issue 4: API Timing Out
**Symptom:** Request fails with timeout

**Fix:**
- Check Neon database performance
- Verify query indexes exist
- Check Vercel function timeout limits

## 📝 Next Steps

1. **Check Vercel logs** (see Step 1 above)
2. **Test API directly** (see Step 2 above)
3. **Verify DATABASE_URL** in Vercel environment variables
4. **Share results** so we can pinpoint the exact issue

## 🐛 Debugging Commands

```bash
# Test locally (should work)
node scripts/test-browse-api.mjs

# Check database state
node scripts/check-database-books.mjs

# View Vercel logs
npx vercel logs --follow
```

## 📊 Expected API Response

When working correctly, `/api/browse?algo=popular` should return:

```json
[
  {
    "id": "661d7f73-dc36-4fd7-94c8-5fd6bba9bf16",
    "googleBooksId": "1O-ODwAAQBAJ",
    "title": "Ascendance of a Bookworm: Part 1 Volume 1",
    "authors": ["Miya Kazuki"],
    ...
  },
  ... (20 books total)
]
```

If empty array `[]` is returned, the API is failing silently or the query is returning no results.

