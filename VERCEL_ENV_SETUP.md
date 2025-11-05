# Vercel Environment Variables Setup

## Required Environment Variable

### DATABASE_URL

**Value:**
```
postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## How to Set in Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project: `bookshelves`

2. **Navigate to Settings:**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add DATABASE_URL:**
   - Click **Add New**
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://neondb_owner:npg_9LouUjhcil4Q@ep-orange-sound-adb604h5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environment:** Select **Production** (and **Preview** if you want)
   - Click **Save**

4. **Redeploy:**
   - After saving, Vercel will prompt you to redeploy
   - Or manually redeploy: `npx vercel --prod`

## Verification

After setting the environment variable and redeploying:

1. **Check Logs:**
   ```bash
   npx vercel logs --follow
   ```
   Look for: `[browse] Returning 20 books` (should show 20, not 0)

2. **Test API:**
   ```bash
   curl "https://bookshelves-1f4r3as3d-john-dunhams-projects-39f6d8ce.vercel.app/api/browse?algo=popular&limit=20"
   ```
   Should return JSON array with 20 books

3. **Check Browser:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Should see your 20 books, not fallback books

## Important Notes

- ✅ **DATABASE_URL is required** for the browse API to work
- ✅ **Pooler URL is correct** (recommended for serverless)
- ⚠️ **Don't commit** DATABASE_URL to git (it's in .gitignore)
- ⚠️ **Each environment** (Production/Preview) needs the variable separately

## Troubleshooting

If books still don't appear after setting DATABASE_URL:

1. **Verify variable is set:**
   - Check Vercel Dashboard → Environment Variables
   - Ensure it's set for **Production** environment

2. **Check logs for errors:**
   ```bash
   npx vercel logs
   ```
   Look for:
   - `Missing DATABASE_URL env var` - Variable not set
   - Connection errors - Database access issue
   - `[browse] Returning 0 books` - Query issue

3. **Test database connection:**
   ```bash
   node scripts/test-browse-api.mjs
   ```
   Should return 20 books if local .env.local is correct

