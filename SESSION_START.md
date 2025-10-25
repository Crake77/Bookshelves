# SESSION START - Master Agent Context

**Purpose:** Single command to load all context at the start of every new Warp session  
**Last Updated:** 2025-10-25

---

## 🎯 QUICK START COMMAND

```
Read SESSION_START.md
```

That's it! This file contains everything you need.

---

## 📋 IMMEDIATE PRIORITIES

**READ THIS FIRST:** `NEXT_AGENT_INSTRUCTIONS.md`

The immediate priorities, current task status, and next actions are maintained in `NEXT_AGENT_INSTRUCTIONS.md` to avoid duplication. Always read that file for:
- What was completed last session
- Current blocking issues
- Next immediate actions
- Specific task instructions

This file (SESSION_START.md) provides the **stable context** that doesn't change session-to-session.

---

## 🏗️ PROJECT ARCHITECTURE

### Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Neon) with pgvector for AI embeddings
- **ORM:** Drizzle ORM
- **UI:** Tailwind CSS + Shadcn/ui + Radix UI
- **AI:** OpenAI embeddings + GPT-4o-mini
- **Mobile:** PWA optimized for iOS

### Essential Commands
```pwsh
# Development
npm run dev          # Start dev server (http://localhost:8001)
npm run build        # Build for production
npm start            # Start production server

# Database
npm run db:push      # Push schema changes to Neon DB

# Type Checking & Testing
npm run check        # TypeScript validation
npm run e2e          # Run Playwright tests

# Git
git pull             # Get latest changes
git status           # Check what changed
git add .            # Stage changes
git commit -m "msg"  # Commit with message
git push             # Push to GitHub
```

### Path Aliases
- `@/*` → `./client/src/*` (Frontend)
- `@shared/*` → `./shared/*` (Shared types)
- `@assets/*` → `./attached_assets/*` (Assets)

### Important Constraints
- **Vercel Hobby Plan:** 12 serverless function limit (11/12 used - 1 slot available)
- **Database:** Direct connection to production Neon DB (no local DB)
- **Windows Environment:** PowerShell 7.5.4, no `psql` installed
- **Shell:** Use PowerShell commands, not bash

---

## 📚 DOCUMENTATION SYSTEM

### Core Documentation Files (Read as Needed)
1. **MASTER_DOCUMENTATION_INDEX.md** - Complete index of all project docs
2. **NEXT_AGENT_INSTRUCTIONS.md** - Current priorities and handoff context
3. **TAXONOMY_PATTERNS_PROGRESS.md** - Pattern completion tracking (2,002 total patterns)
4. **GPT_METADATA_ENRICHMENT_GUIDE.md** - AI enrichment task guide
5. **README.md** - Project setup and overview

### Pattern Files (Classification Rules)
Located in `taxonomy/` directory:
- `domain_patterns.json` (4 patterns) - Top-level classification
- `supergenre_patterns.json` (34 patterns) - Umbrella categories
- `genre_patterns.json` (100 patterns) - Primary genres
- `subgenre_patterns.json` (549 patterns) - Specific subgenres
- `format_patterns.json` (28 patterns) - Book formats
- `age_audience_patterns.json` (7 patterns) - Age/audience ✨ NEW
- `cross_tag_patterns_v1.json` (640 patterns) - Tropes, themes, settings

**Total Active Patterns:** 1,362 core + 640 cross-tags = 2,002 patterns

### Documentation Archive
Old/completed docs moved to `archives/` via manual archive process.

---

## 🤖 AI AGENT WORKFLOW

### Session Start Protocol
1. Read `SESSION_START.md` (this file) for complete context
2. Check immediate priorities section above
3. Pull latest changes: `git pull`
4. Execute current priority tasks

### During Session
- Work on priority tasks efficiently
- Update relevant documentation as you go
- Keep token usage reasonable (~20-40k per session)
- Ask user before major destructive operations

### Session End Protocol
1. **Archive Review** (if workspace is cluttered):
   - Propose files to archive with reasoning
   - Get user approval before archiving
   - Move to `archives/` directory

2. **Update Documentation**:
   - Update `NEXT_AGENT_INSTRUCTIONS.md` with:
     - What was completed
     - Token usage summary
     - Next immediate priority
   - Update `MASTER_DOCUMENTATION_INDEX.md` if new docs created

3. **Commit Everything**:
   ```pwsh
   git add .
   git commit -m "Session YYYY-MM-DD: [summary of work]"
   git push
   ```

4. **Session Summary**:
   Provide brief summary:
   - Work completed
   - Files created/modified
   - Token usage (X / 200k)
   - Next steps location

### Key Principles
- **Be concise** - User has limited token budget
- **Be proactive** - Execute tasks without asking for permission unless risky
- **Be careful** - Database connects to production
- **Don't commit** unless user explicitly asks
- **Archive old docs** to keep workspace clean

---

## 🗄️ DATABASE ARCHITECTURE

### Key Tables

**Core Book Data:**
- `books` - Core book records (id, title, authors, description, coverUrl, etc.)
- `book_embeddings` - OpenAI vector embeddings for AI recommendations
- `book_stats` - Aggregated ratings and rankings

**User Management:**
- `users` - User accounts
- `user_books` - User's shelf associations and ratings
- `custom_shelves` - User-defined shelf types
- `browse_category_preferences` - User's browse category preferences

**Hierarchical Taxonomy:**
- `domains` - Top-level classification (fiction, nonfiction, poetry, drama)
- `supergenres` - Umbrella categories grouping related genres
- `genres` - Primary genre classification
- `subgenres` - Most specific genre classification
- `formats` - Book format (novel, manga, light-novel, audiobook, etc.)
- `age_markets` - Target readership age ranges (early-readers, middle-grade, YA, adult, etc.)
- `cross_tags` - Orthogonal tags (tropes, themes, settings, tone, content warnings, etc.)
- `aliases` - Alternative terms mapped to canonical slugs

**Taxonomy Relationships:**
- `supergenre_domains` - Supergenre ↔ Domain links
- `genre_domains` - Genre ↔ Domain links
- `genre_supergenres` - Genre ↔ Supergenre links
- `subgenre_genres` - Subgenre cross-attachments to additional genres

**Book Classifications:**
- `book_domains` - Book → Domain assignment (one per book)
- `book_supergenres` - Book → Supergenre assignments (multiple allowed)
- `book_genres` - Book → Genre assignments (multiple allowed)
- `book_subgenres` - Book → Subgenre assignments (multiple allowed)
- `book_formats` - Book → Format assignments
- `book_age_markets` - Book → Age market assignments
- `book_cross_tags` - Book → Cross-tag assignments

### Database Operations
```javascript
// Execute SQL on Neon (no psql available on Windows)
import pg from 'pg';
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
await client.connect();
await client.query(sqlString);
await client.end();
```

**Note:** `authors` column is PostgreSQL `TEXT[]` array (use `ARRAY['author1', 'author2']`), not JSON.

---

## 🎨 DEPLOYMENT

### Vercel Deployment
```pwsh
# Preview deploy
npm run build
npx vercel@latest deploy

# Production deploy
npx vercel@latest --prod
```

### Preview Validation
Before sharing preview link:
```pwsh
# Ensure Playwright browsers installed (one-time)
npx playwright install chromium

# Run automated tests
PREVIEW_URL=<preview-url> npx playwright test e2e/shelf-status.spec.ts
```

---

## 🔍 COMMON SCENARIOS

### If Codex (Linux agent) worked while you were away
```pwsh
git pull
```

### If you need to see what changed
```pwsh
git status
git log --oneline -10
```

### If there are merge conflicts
Ask user: "There are merge conflicts. Should I help resolve them?"

### If you need to check Vercel function count
```pwsh
Get-ChildItem -Path api -Recurse -Filter "*.ts" | Measure-Object
```

---

## 💡 COLLABORATION NOTES

### Multi-Agent Setup
- **Warp Agent (You):** Works on Windows with PowerShell
- **Codex Agent:** Works on Linux/Ubuntu with bash
- Both share the same GitHub repository
- Always `git pull` at session start
- Always `git push` at session end

### Communication Between Agents
- Use `NEXT_AGENT_INSTRUCTIONS.md` for handoffs
- Commit and push completed work for other agent
- Document decisions in relevant markdown files

---

## 📊 PROJECT METRICS

### Taxonomy Completion
- **Core Patterns:** 1,362 / 1,362 (100% ✅)
  - Domain: 4 / 4
  - Supergenre: 34 / 34
  - Genre: 100 / 100
  - Subgenre: 549 / 549
  - Format: 28 / 28
  - Age/Audience: 7 / 7
- **Cross-Tags:** 640 / 2,800 (23%)
  - Needs: 2,160 more patterns

### Vercel Resources
- **Serverless Functions:** 11 / 12 (1 slot remaining)
- **Note:** Must consolidate endpoints before adding new ones

---

## 🚨 CRITICAL REMINDERS

1. **Never commit unless user asks explicitly**
2. **Database is production** - be careful with schema changes
3. **Windows PowerShell** - use `Get-ChildItem`, not `ls`
4. **No psql** - use Node.js + pg library for SQL execution
5. **Vercel limit** - only 1 serverless function slot left
6. **Token budget** - be concise, user has 200k limit
7. **Archive old docs** - keep workspace clean
8. **Always pull first** - `git pull` at session start

---

## ✅ SESSION START CHECKLIST

When you read this file at session start:

- [ ] Understand current priority tasks (see section above)
- [ ] Run `git pull` to get latest changes
- [ ] Check if Python installation needs verification
- [ ] Review any blocking issues in priorities
- [ ] Begin executing immediate priority tasks
- [ ] Keep documentation updates minimal during session
- [ ] Plan to update handoff doc at session end

---

**Token Budget Guidance:** Aim for 20-40k tokens per session for efficient multi-session workflows.

**Ready to start!** Execute the immediate priority tasks listed at the top of this file.
