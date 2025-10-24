# Bookshelves – Codex Playbook

## Goal
Build and deploy Bookshelves with Vercel in a fully automated flow. Do not ask for approvals unless a command fails.

## Auth & Env
- Use the saved Vercel CLI login from this machine. If commands return “login required”, prompt me to run `vercel login` in the Ubuntu shell and retry.
- Do **not** write or prompt for tokens. No secrets in files.

## Preview Deploy (default task)
Run these commands in this repo, non-interactively:
1. `vercel pull --environment=preview --yes`
2. `vercel build`
3. `vercel deploy --prebuilt`
Report:
- Preview URL
- Inspect URL
If any command fails, stop, show the exact stderr, and suggest the single next command to run.

### Preview Validation Workflow
Before sharing the preview link or doing any manual testing:
1. (One-time per machine) ensure browsers are installed with `npx playwright install chromium`.
2. After `vercel deploy --prebuilt`, run the headless user flow against the fresh preview:
   ```
   PREVIEW_URL=<preview-url> npx playwright test e2e/shelf-status.spec.ts
   ```
3. Only share the preview link if the Playwright run passes. If it fails, fix the issue first, rerun the test, then report success.
4. Mention in the update that the automated shelf-status test passed.
5. Remind the user to hard reload once so the updated service worker takes effect.

## Production Deploy (on request)
When I say “promote” or “deploy to prod”, run:
- `vercel --prod`
Then report the Production URL and Inspect URL.

## GitHub
When I say “commit” or “push”, stage changes, commit with a concise message, and push to `main`. If there are merge conflicts or auth issues, stop and show me the exact error.

## Safety & Scope
- Work only inside the current workspace.
- Assume network is allowed.
- Do not modify unrelated files.

---

# Warp Agent Guidelines

## Environment & Context
- **Platform**: Windows 10/11 with PowerShell 7.5.4 (pwsh)
- **Shell-specific notes**: 
  - Modern cross-platform PowerShell with improved performance
  - Use `Invoke-WebRequest` or `curl` alias for API testing
  - PowerShell execution policy is set to RemoteSigned
  - Node.js/npm are installed and configured

## Development Workflow
1. **Local Development**:
   ```powershell
   npm run dev          # Development server (port 8001)
   npm run check        # TypeScript validation
   npm run e2e          # Run Playwright tests
   ```

2. **Database Operations**:
   ```powershell
   npm run db:push      # Push schema changes to Neon DB
   ```
   - Always connected to production Neon DB (no local DB)
   - Schema changes go directly to shared database
   - Be cautious with destructive migrations
   
   **Executing SQL Scripts**:
   - `psql` is NOT installed on Windows
   - Use Node.js with `pg` library to execute SQL against Neon:
   ```javascript
   import pg from 'pg';
   const client = new pg.Client({
     connectionString: process.env.DATABASE_URL,
     ssl: { rejectUnauthorized: false }
   });
   await client.connect();
   await client.query(sqlString);
   await client.end();
   ```
   - DATABASE_URL is available in `.env.local`
   - Always wrap multiple statements in BEGIN/COMMIT for transactions
   - Remember: `authors` column is PostgreSQL `TEXT[]` array (use `ARRAY['author1', 'author2']`), not JSON

3. **Deployment**:
   ```powershell
   npm run build                    # Build locally
   npx vercel@latest deploy         # Deploy to preview
   npx vercel@latest --prod         # Deploy to production
   ```

## Vercel Constraints
- **Hobby Plan Limit**: Maximum 12 serverless functions in `/api` directory
- **Current Count**: 11/12 functions (1 slot available)
- **When adding APIs**: Check function count first with:
  ```powershell
  Get-ChildItem -Path api -Recurse -Filter "*.ts" | Measure-Object
  ```
- **If at limit**: Consolidate endpoints before adding new ones

## Code Architecture Notes
- **Path Aliases**: `@/*` (frontend), `@shared/*` (shared types), `@assets/*` (assets)
- **Database**: PostgreSQL with pgvector extension for AI embeddings
- **AI Integration**: OpenAI API with graceful fallback handling
- **Mobile-first**: PWA optimized for iOS, test with iPhone viewport

## Testing
- E2E tests require `PREVIEW_URL` environment variable
- Tests use Playwright with mobile device emulation
- Run specific tests: `npx playwright test e2e/<filename>.spec.ts`

## Collaboration with Codex
- Both agents work on same codebase via Git
- Codex uses Linux/Ubuntu shell commands
- Warp uses Windows PowerShell commands
- Always pull latest changes before starting work
- Commit and push completed features for the other agent to access
