# Bookshelves Project - Master Documentation Index

**Last Updated**: 2025-11-05  
**Version**: 1.1.0  
**Purpose**: Central index of all active project documentation, logically organized by purpose

---

## 📚 How to Use This Index

- **AI Agents**: Review this index at session start to understand available documentation
- **Developers**: Use as quick reference to find relevant docs
- **Maintainers**: Update this index when adding/archiving major documentation

**Archive System**: Old/completed docs are moved to `archives/` via `archive-old-docs.js`

---

## 🎯 Core Pattern Files (Classification Rules)

These JSON files contain weighted detection patterns for book classification during scraping/enrichment.

### Taxonomy Patterns (1,362 patterns - 100% complete)

| File | Size | Patterns | Description |
|------|------|----------|-------------|
| `domain_patterns.json` | 12 KB | 4 | Top-level domain classification (fiction, non-fiction, poetry, drama) with multi-factor weighted scoring |
| `supergenre_patterns.json` | 26 KB | 34 | Umbrella genre categories (speculative-fiction, romance, crime-mystery, etc.) grouping related genres |
| `genre_patterns.json` | 90 KB | 100 | Primary genre classification (fantasy, sci-fi, mystery, thriller, biography, etc.) |
| `subgenre_patterns.json` | 313 KB | 549 | Most specific genre classification (epic-fantasy, cozy-mystery, space-opera, etc.) |

### Format & Audience Patterns (35 patterns - 100% complete)

| File | Size | Patterns | Description |
|------|------|----------|-------------|
| `format_patterns.json` | 34 KB | 28 | Book format detection (novel, manga, light-novel, audiobook, graphic-novel, etc.) with special focus on Asian formats |
| `age_audience_patterns.json` | 26 KB | 7 | Age/audience classification with conservative rules for mature content (early-readers, middle-grade, YA, new-adult, adult, general-audience) |

### Cross-Tag Patterns (3,140 patterns - 100% complete)

| File | Size | Patterns | Description |
|------|------|----------|-------------|
| `cross_tag_patterns_v1.json` | 1.2 MB | 3,140 | Orthogonal tags (tropes, themes, settings, tone, content warnings) - 100% pattern coverage, includes 640 manual + 2,500 auto-generated patterns |

### Reference Data

| File | Size | Description |
|------|------|-------------|
| `bookshelves_complete_taxonomy.json` | 784 KB | Complete exported taxonomy from production database (genres, subgenres, supergenres, cross-tags) |

---

## 📖 Pattern Documentation (How-To Guides)

These markdown files explain the pattern systems and provide usage examples.

### Pattern System Documentation

| File | Size | Purpose |
|------|------|---------|
| `TAXONOMY_PATTERNS_ARCHITECTURE.md` | 14 KB | Architecture design for hierarchical pattern matching system, confidence thresholds, scoring formulas |
| `TAXONOMY_PATTERNS_PROGRESS.md` | 25 KB | **Master progress tracker** - tracks completion status of all 2,002 patterns across taxonomy levels |
| `FORMAT_PATTERNS_SUMMARY.md` | 10 KB | Format detection guide with examples, publisher markers, weighted scoring methodology for 28 formats |
| `AGE_AUDIENCE_PATTERNS_SUMMARY.md` | 19 KB | Age/audience classification guide with conservative rules, mature content triggers, upward-inclusive tagging logic |
| `CROSS_TAG_PATTERNS_PROGRESS.md` | 16 KB | Cross-tag pattern progress tracker with coverage by group (tropes, themes, settings, etc.) |
| `CROSS_TAG_SYSTEM_DESIGN.md` | 14 KB | Cross-tag system architecture, pattern structure, exact/synonym/contextual phrase matching |

### Task Handoffs (For Next Agent)

| File | Size | Purpose |
|------|------|---------|
| `HANDOFF_AGE_AUDIENCE_PATTERNS.md` | 17 KB | Detailed task specification for age/audience pattern creation (completed, kept as reference) |
| `NEXT_AGENT_INSTRUCTIONS.md` | 45 KB | **Current handoff** - instructions for next agent session with context and priorities |
| `COMPREHENSIVE_PATTERN_MATCHING_IMPLEMENTATION.md` | 12 KB | **NEW** - Documentation of comprehensive pattern matching system using all evidence sources |

---

## 🗃️ Database & Schema

Database structure, taxonomy reference, and data management.

| File | Size | Purpose |
|------|------|---------|
| `DATABASE_SCHEMA_REFERENCE.md` | 15 KB | **Primary schema reference** - complete database schema including all tables, relationships, and field definitions |
| `BOOKSHELVES_TAXONOMY_REFERENCE.md` | 7 KB | Quick taxonomy overview with domain/supergenre/genre/subgenre examples |

---

## 🤖 AI Agent Guides

Instructions for AI agents performing enrichment tasks.

| File | Size | Purpose |
|------|------|---------|
| `GPT_METADATA_ENRICHMENT_GUIDE.md` | 51 KB | **Master enrichment guide** - comprehensive instructions for AI to enrich book metadata (now includes Evidence Packs & Provenance) |
| `STARTUP_SESSION.md` | 3 KB | Session bootstrap checklist (pull → env → Session Start → Next Agent → Doc index → plan → report) |
| `archives/GPT_CROSS_TAG_GENERATION_PROMPT.md` | 12 KB | (Archived) Legacy prompt for cross-tag pattern generation; superseded by `cross_tag_patterns_v1.json` |
| `AGENTS.md` | 5 KB | **AI agent workflow guide** - session structure, handoff protocol, archive review process |

---

## 🔧 Enrichment System (Scripts)

Node.js scripts for batch book metadata enrichment pipeline.

### Enrichment Task Scripts

Located in `enrichment-tasks/` directory:

| File | Purpose |
|------|---------|
| `README.md` | Overview of 8-task enrichment pipeline |
| `task-01-cover-urls.js` | Fetch cover image URLs from Google Books API |
| `task-02-authors.js` | Extract and normalize author names |
| `task-03-summary.js` | Generate AI-powered book summaries (GPT-4) |
| `task-04-domain-supergenres.js` | Detect domain and supergenre classifications |
| `task-05-genres-subgenres.js` | Detect genre and subgenre classifications |
| `task-06-cross-tags.js` | Detect cross-tags (tropes, themes, settings) |
| `task-07-format-audience.js` | Detect book format and target audience |
| `task-08-generate-sql.js` | Generate SQL insert statements for database |
| `validate-quality.js` | Validate enrichment data quality before import |

### Batch Processing Scripts

Root-level utility scripts:

| File | Purpose |
|------|---------|
| `enrich-batch.js` | Main batch enrichment orchestrator - runs all 8 tasks in sequence |
| `check-batch.js` | Check batch enrichment status and progress |
| `check-book.js` | Check single book enrichment data |
| `execute-batch-sql.js` | Execute generated SQL files to import enriched data |
| `export-books-batch.js` | Export books from database for batch processing |
| `export-taxonomy.js` | Export complete taxonomy to JSON file |
| `sync-taxonomy.js` | Sync taxonomy changes to database |
| `deploy_taxonomy.js` | Deploy taxonomy updates to production |
| `archive-old-docs.js` | Archive old/completed documentation (use `--dry-run` flag) |

---

## 📊 Batch Work Tracking

Documentation for batch enrichment work and quality tracking.

| File | Size | Purpose |
|------|------|---------|
| `BATCH_ENRICHMENT_MASTER.md` | 19 KB | Master tracking document for batch enrichment sessions with quality metrics and issue logs |
| `BATCH_MANIFEST.json` | 4 KB | Batch book manifest with IDs, titles, and status |
| `books_batch_001.json` | 14 KB | Book batch 001 raw data (10 books for initial enrichment testing) |
| `SUMMARY_REWRITE_WORKSHEET.md` | 30 KB | Working document for summary quality improvements |
| `ENRICHMENT_ISSUES_LOG.md` | 6 KB | Log of enrichment issues, bugs, and resolutions |

---

## 🚀 Deployment & Operations

Deployment guides and operational documentation.

| File | Size | Purpose |
|------|------|---------|
| `DEPLOYMENT_SUMMARY.md` | 8 KB | Deployment history, Vercel setup, environment configuration |
| `README.md` | 7 KB | **Project README** - setup instructions, tech stack, development workflow |
| `QUICK_START.md` | 2 KB | Quick start guide for local development |

---

## 🎨 UI/UX & Frontend

User interface plans and design guidelines.

| File | Size | Purpose |
|------|------|---------|
| `FRONTEND_UI_PLAN.md` | 13 KB | Frontend UI architecture plan with component structure |
| `FILTER_UI_IMPROVEMENTS.md` | 9 KB | Taxonomy filter UI improvements and enhancement proposals |
| `API_FILTERS_TODO.md` | 5 KB | API filter endpoint improvements and TODO items |
| `design_guidelines.md` | 8 KB | Design system guidelines and component standards |

---

## 📝 Planning & Future Work

Strategic planning documents and future enhancement proposals.

Located in `docs/` directory:

### Future Plans

| File | Purpose |
|------|---------|
| `docs/future-plans/taxonomy-ui-updates.md` | Proposed taxonomy UI/UX improvements |

### Technical Plans

| File | Purpose |
|------|---------|
| `docs/tech-plans/taxonomy-ui-plan.md` | Detailed technical plan for taxonomy UI implementation |

### Operations

| File | Purpose |
|------|---------|
| `docs/ops/browse-infinite-scroll.md` | Browse page infinite scroll implementation |
| `docs/ops/taxonomy-heuristics.md` | Taxonomy heuristic detection rules and logic |
| `docs/ops/vercel-functions-reduction.md` | Strategy to reduce Vercel serverless function count |
| `docs/ops/dialog-runtime-error.md` | Dialog component runtime error troubleshooting |
| `docs/ops/cross-tag-gap-report.md` | Missing cross-tag slug inventory + mapping/alias recommendations (2025-10-26) |
| `docs/ops/session-issues-2025-10-26.md` | Validator + TypeScript blocker summary with remediation steps |
| `docs/ops/metadata-source-roadmap.md` | Multi-source metadata adapter architecture (LoC, FAST, Wikidata, etc.) |
| `docs/ops/session-notes-2025-11-01-fast-integration.md` | FAST adapter connectivity verification session |
| `docs/ops/session-notes-2025-11-02-format-detection-fast.md` | Format detection enhancement + batch 001 completion session |

### Reference

| File | Purpose |
|------|---------|
| `docs/taxonomy-reference.md` | Taxonomy structure reference guide |

---

## 🗂️ Archives

Old documentation is moved to `archives/` directory via `archive-old-docs.js` script.

### Archive Categories

| Directory | Contents |
|-----------|----------|
| `archives/sessions/` | Old session handoffs and summaries |
| `archives/batch_work/` | Completed batch enrichment documentation |
| `archives/cross_tag_batches/` | Individual cross-tag batch files (merged into v1) |
| `archives/completed_workflows/` | Completed workflow and fix documentation |
| `archives/old_handoffs/` | Superseded task handoffs |
| `archives/deprecated/` | Deprecated/redundant files |
| `archives/ARCHIVE_MANIFEST.json` | Archive manifest with file listings and metadata |

**Already Archived** (in `docs_archive/`):
- Old GPT guides and task documents
- Previous taxonomy system documentation
- Historical workflow fixes

---

## 🔍 Quick Reference

### For AI Agents Starting a New Session

**Must Read** (Review index first, then dive into specifics as needed):
1. `DOCUMENTATION_MASTER_INDEX.md` (this file) - Get overview of available docs
2. `AGENTS.md` - Understand agent workflow and session protocol
3. `NEXT_AGENT_INSTRUCTIONS.md` - Check current priorities and context
4. `TAXONOMY_PATTERNS_PROGRESS.md` - Check pattern completion status

**Task-Specific Documentation**:
- Enrichment work → `GPT_METADATA_ENRICHMENT_GUIDE.md`
- Pattern creation → `TAXONOMY_PATTERNS_ARCHITECTURE.md`
- Schema questions → `DATABASE_SCHEMA_REFERENCE.md`
- Format patterns → `FORMAT_PATTERNS_SUMMARY.md`
- Age/audience → `AGE_AUDIENCE_PATTERNS_SUMMARY.md`

### For Developers

**Core System**:
- Database: `DATABASE_SCHEMA_REFERENCE.md`
- Patterns: `TAXONOMY_PATTERNS_ARCHITECTURE.md`
- Enrichment: `enrichment-tasks/README.md`

**Frontend/UI**:
- UI Plan: `FRONTEND_UI_PLAN.md`
- Filters: `FILTER_UI_IMPROVEMENTS.md`

**Deployment**:
- Setup: `README.md`
- Deploy: `DEPLOYMENT_SUMMARY.md`

---

## 📋 Maintenance Checklist

### When Adding New Documentation

- [ ] Add entry to this index in appropriate section
- [ ] Include file size, pattern count (if applicable), and purpose
- [ ] Update "Last Updated" date at top of index
- [ ] Commit with descriptive message

### When Archiving Old Documentation

- [ ] Run `node archive-old-docs.js --dry-run` to preview
- [ ] Review which files will be archived
- [ ] Run `node archive-old-docs.js` to execute archive
- [ ] Remove archived files from this index
- [ ] Update archive section with any new categories
- [ ] Commit with "chore: archive old documentation" message

### Session End Protocol (for AI Agents)

- [ ] Review this index for any new docs created during session
- [ ] Propose any docs that should be archived
- [ ] Update `NEXT_AGENT_INSTRUCTIONS.md` if needed
- [ ] Commit all changes before ending session

---

**Total Active Patterns**: 2,002 (core: 1,362 + cross-tags: 640)  
**Documentation Files**: ~40 active files (excluding archived)  
**Last Major Update**: 2025-10-24 (Age/Audience patterns completed)
