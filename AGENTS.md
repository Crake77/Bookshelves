# SESSION_START REMINDER

Codex: Do not begin any task from `/status` until you have opened `SESSION_START.md`, completed its checklist, and only then returned here for the detailed Bookshelves playbook. Repeat that process whenever the environment changes.

# Bookshelves – Codex Playbook

> **⚠️ NOTE:** For Warp agents, use `SESSION_START.md` instead - it consolidates all workflow context in one place.
> This file (AGENTS.md) contains legacy multi-agent guidelines and detailed protocols.

## Goal
Build and deploy Bookshelves with Vercel in a fully automated flow. Do not ask for approvals unless a command fails.

## Startup Workflow (Always)
- Pull latest from GitHub first: `git fetch && git pull`
- Read `SESSION_START.md` for stable context and guardrails
- Read `NEXT_AGENT_INSTRUCTIONS.md` for immediate priorities
- Read `DOCUMENTATION_MASTER_INDEX.md` to identify any relevant docs for this session
- Only execute deploys/tests when explicitly requested in `NEXT_AGENT_INSTRUCTIONS.md` or by the user

## Auth & Env
- Use the saved Vercel CLI login from this machine. If commands return “login required”, prompt me to run `vercel login` in the Ubuntu shell and retry.
- Do **not** write or prompt for tokens. No secrets in files.

## Preview Deploy (when requested)
If `NEXT_AGENT_INSTRUCTIONS.md` or the user requests a preview deploy, run:
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

---

# Session End Protocol for AI Agents

## Before Ending Any Session

Perform these steps to maintain documentation hygiene and ensure smooth handoffs:

### 1. Review Documentation Master Index

**Read** `DOCUMENTATION_MASTER_INDEX.md` to:
- Get high-level overview of all active documentation
- Understand what docs exist and their purposes
- Identify any docs you created/modified during this session

**Note**: Do NOT read every file in the index, just review the index itself for awareness.

### 2. Propose Documentation Archive

If you believe any documentation should be archived:

**Ask the user**:
> "I recommend archiving the following files as they appear to be outdated/completed:
> - [file1] - Reason
> - [file2] - Reason
> 
> Would you like me to add these to `archive-old-docs.js` and run the archive?"

**Criteria for archiving**:
- ✅ Old session handoffs (superseded by newer sessions)
- ✅ Completed batch work documentation
- ✅ Merged/consolidated files (e.g., cross-tag batches merged into v1)
- ✅ Completed workflow fixes
- ✅ Duplicate/redundant documentation
- ❌ Active pattern files
- ❌ Current reference documentation
- ❌ Guides still in use

**If user approves archiving**:
1. Update `archive-old-docs.js` to include the files
2. Run `node archive-old-docs.js --dry-run` to preview
3. Run `node archive-old-docs.js` to execute archive
4. Update `DOCUMENTATION_MASTER_INDEX.md` to remove archived entries
5. Commit changes with message: `chore: archive completed documentation`

### 3. Review/Update Documentation Index

If you created new documentation during this session:

**Ask the user**:
> "I created the following new documentation:
> - [file1] - Purpose
> - [file2] - Purpose
> 
> Should I add these to DOCUMENTATION_MASTER_INDEX.md?"

**If user approves**:
1. Add entries to appropriate section in `DOCUMENTATION_MASTER_INDEX.md`
2. Include file size, purpose, and brief description
3. Update "Last Updated" date at top of index
4. Commit changes

### 4. Create/Update Handoff Document

**Ask the user**:
> "Should I create/update a handoff document for the next agent session?"

**If user approves**:
- Update `NEXT_AGENT_INSTRUCTIONS.md` with:
  - Summary of work completed this session
  - Current priorities and next steps
  - Any blockers or issues to be aware of
  - Links to relevant new documentation
  - Token budget used this session

### 5. Final Commit Check

Ensure all work is committed:
```powershell
git status                    # Check for uncommitted changes
git add .                     # Stage all changes
git commit -m "<summary>"     # Commit with descriptive message
git push                      # Push to remote
```

### 6. Session Summary

Provide brief summary:
> "✅ Session Complete:
> - Work: [brief summary]
> - Commits: [count] commits pushed
> - Documentation: [updated/created]
> - Archive: [files archived if any]
> - Token usage: [X/200k]
> - Next: See NEXT_AGENT_INSTRUCTIONS.md for handoff"

## Example Session End Flow

```
AI: "I've completed the age/audience pattern work. Before ending:

1. I've reviewed DOCUMENTATION_MASTER_INDEX.md and see we have:
   - 7 active pattern files
   - ~40 documentation files
   - Several old session handoffs

2. I recommend archiving these old session files:
   - SESSION_2_HANDOFF.md - Superseded by current session
   - SESSION_3_HANDOFF.md - Superseded by current session
   - SESSION_HANDOFF_PHASE5.md - Phase 5 is complete
   
   Would you like me to archive these?

3. I created these new files this session:
   - age_audience_patterns.json (26 KB)
   - AGE_AUDIENCE_PATTERNS_SUMMARY.md (19 KB)
   - archive-old-docs.js (archive script)
   - DOCUMENTATION_MASTER_INDEX.md (this index)
   
   Should I add these to the master index?

4. Should I update NEXT_AGENT_INSTRUCTIONS.md for the next session?"
```

## Archive Script Usage

The archive script is located at `archive-old-docs.js`:

```powershell
# Preview what will be archived (safe)
node archive-old-docs.js --dry-run

# Execute the archive
node archive-old-docs.js
```

Archived files are moved to:
- `archives/sessions/` - Old session handoffs
- `archives/batch_work/` - Completed batch work
- `archives/cross_tag_batches/` - Merged batch files
- `archives/completed_workflows/` - Finished workflows
- `archives/old_handoffs/` - Superseded handoffs
- `archives/deprecated/` - Redundant files

A manifest is created at `archives/ARCHIVE_MANIFEST.json` with details of all archived files.

---

**Key Principle**: Keep documentation lean and organized. Archive completed work, maintain clear index, ensure smooth handoffs.
