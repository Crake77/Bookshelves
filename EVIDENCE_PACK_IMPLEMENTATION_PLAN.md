# Evidence-Pack Architecture Implementation Plan

**Created:** 2025-10-25  
**Status:** Refer to `GPT_METADATA_ENRICHMENT_GUIDE.md` ("Evidence Packs & Provenance") for the canonical workflow. This document now tracks high-level status/changelog only.  
**Goal:** Replace single-summary tagging with multi-source evidence packs for richer, auditable metadata

---

## 📋 Overview

### Current Problem
- Tagging from single summary = shallow signals
- No provenance = can't explain tag decisions
- Feedback loop on own summaries = compounding errors
- No confidence tracking = can't prioritize review

### Solution
- Harvest from 5 sources (Wikidata, Wikipedia, OpenLibrary, Google Books, LCSH)
- Store thin, versioned snapshots (0.5-2KB extracts)
- Track provenance (which sources support each tag)
- Enable auditability (reproduce any tag decision)

### Expected Results
- **Richer signals:** More accurate genre/trope detection
- **Explainability:** "Tagged 'time-travel' from Wikidata Q12345 + Wikipedia rev 987654"
- **Review efficiency:** Low-confidence tags auto-routed to review queue
- **Storage:** ~400-500 MB for 100k books (negligible on Neon)

---

## 🗂️ Architecture Components

### 1. Database Schema (Complete ✅)
**File:** `db/migrations/001_evidence_pack_architecture.sql`

**Tables Added:**
- `source_snapshots` - Thin versioned evidence from 5 sources
- `works.work_ref_type/value` - FRBR-lite authority linking
- `book_cross_tags.source_ids/method` - Tag provenance tracking

**Run Migration:**
```bash
# Via psql (need to install or use Node.js pg client)
node scripts/execute-sql.js db/migrations/001_evidence_pack_architecture.sql
```

### 2. Drizzle Schema Updates (TODO)
**File:** `shared/schema.ts`

Add these exports:
```typescript
// Source snapshots table
export const sourceSnapshots = pgTable("source_snapshots", { ... });

// Update works table
export const works = pgTable("works", {
  // existing fields...
  workRefType: text("work_ref_type"),
  workRefValue: text("work_ref_value"),
});

// Update book_cross_tags
export const bookCrossTags = pgTable("book_cross_tags", {
  // existing fields...
  sourceIds: uuid("source_ids").array(),
  method: text("method"),
  taggedAt: timestamp("tagged_at").defaultNow(),
});
```

### 3. Utility Modules (TODO)
**Location:** `scripts/utils/`

**Files to create:**
- `hash.ts` - SHA-256 hashing for fingerprints
- `rateLimit.ts` - Sleep/jitter for API rate limiting
- `objectStore.ts` - Optional S3/R2 upload for large content

### 4. API Clients (TODO)
**Location:** `scripts/harvest/clients/`

**Files to create:**
- `wikidata.ts` - SPARQL queries for structured genre data
- `wikipedia.ts` - REST API for article extracts
- `openLibrary.ts` - Enhanced OL API client with Work ID resolution
- `googleBooks.ts` - Existing, no changes needed
- `lcsh.ts` - Library of Congress Subject Headings (optional Phase 2)

### 5. Evidence Pack Builder (TODO)
**File:** `scripts/harvest/buildEvidence.ts`

**Key functions:**
- `getISBNForWork(workId)` - Resolve ISBN from editions
- `getWikipediaTitleForWork(workId)` - Derive from Wikidata or work title
- `needsReharvest(workId)` - Check if snapshots are stale (>90 days)
- `buildAndPersistEvidence(opts)` - Main orchestrator

### 6. Main Harvester (TODO)
**File:** `scripts/harvest/main.ts`

**Features:**
- Concurrency control (p-limit)
- Progress tracking (console logs every 10 works)
- Error handling (log failures, continue batch)
- Candidate selection (works missing snapshots or stale)

**Usage:**
```bash
npm run harvest 50  # Harvest 50 works
```

### 7. Validator (TODO)
**File:** `scripts/validate/validator.ts`

**Rules to implement:**
- Contradiction detection (picture-book + explicit-violence)
- Confidence thresholds (< 0.7 = needs review)
- Missing provenance (source_ids null or empty)
- Invalid taxonomy slugs

### 8. Enhanced Tagger (TODO)
**Update:** `enrichment-tasks/task-06-cross-tags.js`

**Changes:**
- Pass evidence pack (not just summary) to LLM
- Request provenance in output format:
  ```json
  {
    "tags": ["time-travel", "dystopian"],
    "provenance": {
      "time-travel": ["wikidata:Q12345", "wikipedia:rev_987654"],
      "dystopian": ["lcsh:Dystopian fiction"]
    },
    "confidence": { "time-travel": 0.92, "dystopian": 0.78 }
  }
  ```
- Store `source_ids` and `method` in database

---

## 📅 Implementation Timeline

### Week 1: Foundation (Nov 1-7)
**Day 1-2: Schema & Utils**
- ✅ Run SQL migration in Neon
- ✅ Update Drizzle schema
- ✅ Create utility modules (hash, rateLimit, objectStore)
- ✅ Install dependencies: `npm install p-limit p-retry undici zod`

**Day 3-4: API Clients**
- ✅ Build Wikidata client (SPARQL queries)
- ✅ Build Wikipedia client (REST API)
- ✅ Enhance OpenLibrary client (Work ID resolution)
- ✅ Test each client standalone

**Day 5: Evidence Builder**
- ✅ Build ISBN/title resolution functions
- ✅ Build evidence pack orchestrator
- ✅ Test on 10 works manually

**Weekend: Testing**
- Run harvester on 50 works
- Inspect `source_snapshots` table
- Verify storage size (~25-50 MB)

### Week 2: Integration (Nov 8-14)
**Day 1-2: Enhanced Tagger**
- Update LLM prompt to require provenance
- Parse provenance from LLM output
- Store `source_ids` and `method` in DB

**Day 3: Validator**
- Implement contradiction rules
- Implement confidence threshold checks
- Build review queue export

**Day 4-5: Testing & Tuning**
- Run full pipeline on 200 works
- Review 20 manually
- Tune confidence thresholds
- Adjust contradiction rules

**Weekend: Backfill**
- Run harvester on books 11-100
- Monitor storage and performance
- Document any issues

### Week 3: Production (Nov 15-21)
**Day 1-2: Documentation**
- Update `GPT_METADATA_ENRICHMENT_GUIDE.md`
- Update `TAXONOMY_PATTERNS_PROGRESS.md`
- Create user-facing provenance UI mockup

**Day 3-5: Scale Testing**
- Backfill all existing books
- Run validator on all tagged books
- Build review queue dashboard

---

## 🧪 Testing Strategy

### Unit Tests
```bash
# Test each API client individually
npm test scripts/harvest/clients/wikidata.test.ts
npm test scripts/harvest/clients/wikipedia.test.ts
```

### Integration Tests
```bash
# Test evidence pack building
npm run harvest:test 10  # Test mode: 10 works, detailed logging
```

### Validation Tests
```bash
# Check for contradictions in existing data
npm run validate:all

# Export review queue
npm run validate:export-review-queue
```

### Performance Tests
```bash
# Measure harvest speed
time npm run harvest 100

# Check DB size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_total_relation_size('source_snapshots'));"
```

---

## 📊 Success Metrics

### Storage Targets
| Component | Target | Actual | Status |
|-----------|--------|--------|--------|
| `source_snapshots` (100 works) | 1-2 MB | TBD | 🟡 |
| Provenance arrays (100 works) | 40 KB | TBD | 🟡 |
| Full pipeline (100 works) | 1.5-2.5 MB | TBD | 🟡 |

### Quality Targets
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Tags with provenance | > 95% | TBD | 🟡 |
| Wikidata hit rate | > 70% | TBD | 🟡 |
| Wikipedia hit rate | > 60% | TBD | 🟡 |
| Average confidence | > 0.75 | TBD | 🟡 |
| Contradictions detected | < 5% | TBD | 🟡 |

### Performance Targets
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Harvest speed | 10-20 works/min | TBD | 🟡 |
| Tagger speed | 5-10 works/min | TBD | 🟡 |
| End-to-end (harvest+tag) | 100 works in < 30 min | TBD | 🟡 |

---

## 🚨 Known Risks & Mitigations

### Risk 1: API Rate Limits
**Impact:** Wikidata/Wikipedia may throttle requests  
**Mitigation:** 
- Built-in rate limiting (200ms delay + jitter)
- Retry logic with exponential backoff
- Batch processing (not real-time)

### Risk 2: Missing ISBNs
**Impact:** Can't fetch Wikidata for books without ISBN  
**Mitigation:**
- Fall back to title+author matching
- Use OpenLibrary Work ID as alternative
- Accept some works won't have Wikidata

### Risk 3: Storage Growth
**Impact:** Snapshots could grow large over time  
**Mitigation:**
- Keep only latest snapshot per source
- Trim extracts to 2KB max
- Optional: Evict snapshots older than 1 year

### Risk 4: Stale Snapshots
**Impact:** Upstream sources change, our snapshots become outdated  
**Mitigation:**
- Harvest fingerprint checks (compare revisions)
- Re-harvest works older than 90 days
- Track `fetched_at` for monitoring

---

## 📦 Dependencies to Install

```bash
# API clients and utilities
npm install undici p-retry p-limit zod

# Optional: Object storage (S3/R2)
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage

# Optional: Compression
npm install zlib  # Built-in Node.js module
```

---

## 🔧 Environment Variables

Add to `.env.local`:
```env
# Evidence harvesting
WIKIDATA_USER_AGENT="BookshelvesBot/1.0 (contact: you@example.com)"
HARVEST_CONCURRENCY=5
HARVEST_RATE_LIMIT_MS=200

# Optional: Object storage
OBJECT_STORE_KIND=none  # or 's3' | 'r2'
OBJECT_STORE_BUCKET=bookshelves-snapshots
OBJECT_STORE_REGION=us-east-1
OBJECT_STORE_ACCESS_KEY_ID=
OBJECT_STORE_SECRET_ACCESS_KEY=
```

---

## 📚 Related Documentation

- **GPT_METADATA_ENRICHMENT_GUIDE.md** - Main enrichment workflow (needs update)
- **TAXONOMY_PATTERNS_PROGRESS.md** - Pattern completion tracking (needs update)
- **SESSION_START.md** - Agent onboarding (reference for workflow)
- **NEXT_AGENT_INSTRUCTIONS.md** - Current priorities (update after Week 1)

---

## ✅ Quick Start Checklist

**Before starting:**
- [ ] Review this plan with team
- [ ] Confirm Neon DB has enough storage (should be fine)
- [ ] Set up monitoring for harvest job failures

**Week 1 Day 1:**
- [ ] Run SQL migration
- [ ] Update Drizzle schema
- [ ] Create `scripts/utils/` directory
- [ ] Install dependencies

**First Test:**
- [ ] Harvest 10 works
- [ ] Inspect `source_snapshots` table
- [ ] Verify provenance fields populated

---

**Status Legend:**
- ✅ Complete
- 🟡 In Progress / TODO
- ❌ Blocked
- ⚠️ At Risk

**Next Update:** After Week 1 completion
