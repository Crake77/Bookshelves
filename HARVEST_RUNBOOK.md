# Evidence Harvest Runbook

**Purpose:** Operational checklist for running the evidence-pack harvester that populates `source_snapshots` with OpenLibrary/Wikipedia extracts and provenance metadata.

---

## ✅ Prerequisites
- `DATABASE_URL` pointing at the Neon database (read/write)
- `npm install` already run
- Latest `main` pulled (`git fetch && git pull`)
- Environment variables (optional overrides):
  - `HARVEST_BATCH_SIZE` (default `10`)
  - `HARVEST_CONCURRENCY` (default `3`)
  - `EVIDENCE_STALE_DAYS` (default `90`)
  - `EVIDENCE_EXTRACT_LIMIT` (default `1800`)
  - `WIKIPEDIA_LANG`, `WIKIPEDIA_USER_AGENT`, `WIKIDATA_USER_AGENT`

## 🚀 Command
```bash
npm run harvest [batchSize]
```
- If `batchSize` is omitted, falls back to `HARVEST_BATCH_SIZE` or `10`.
- Uses `p-limit` with the configured concurrency.

## 📋 Workflow
1. **Select candidates**: Queries `works` ordered by `updated_at`, filters by `needsReharvest` (missing snapshots or stale > `EVIDENCE_STALE_DAYS`).
2. **Fetch evidence** (per work):
   - OpenLibrary: resolves ISBN via editions, pulls work/edition metadata, subjects, cover hints.
   - Wikipedia: resolves page title (via Wikidata if available) and fetches intro extract+revision.
3. **Upsert `source_snapshots`**:
   - Each source gets one row (`work_id`, `source`, `source_key`, `revision`, `url`, `license`, `extract`, `sha256`).
   - Existing rows updated in-place (unique constraint on `work_id + source`).
4. **Log outcome**: CLI prints `updated [sources]` or `no changes` per work; failures are reported with stack traces.

## 🔍 Verification Checklist
After each run:
- Query recent snapshots:
  ```sql
  SELECT work_id, source, fetched_at FROM source_snapshots
  ORDER BY fetched_at DESC LIMIT 20;
  ```
- Spot-check a work:
  ```sql
  SELECT * FROM source_snapshots WHERE work_id = '<uuid>'; 
  ```
  Confirm `extract` text, `license`, and `sha256` are populated.
- Ensure downstream tagging jobs (pattern/LLM) can reference `source_snapshots.id` for provenance.

## ⚠️ Error Handling
- **HTTP 429/5xx**: The harvester logs and skips that work; rerun when source is available.
- **Missing ISBN**: OpenLibrary step is skipped (logged as `no ISBN available`). Consider enriching editions before re-running.
- **Wikipedia miss**: Falls back to work title; if still missing, mark skipped and continue.
- **Database errors**: Harvester exits non-zero. Fix issue, then re-run for the failed batch.

## 📈 Backfill Strategy
1. Dry run with `npm run harvest 5` to verify environment.
2. Increase batch size gradually (e.g., 25 → 50) while monitoring Neon storage and rate limits.
3. After a large run, capture metrics (number of snapshots, table size) and log in the session handoff.

## 🧰 Related Docs
- `GPT_METADATA_ENRICHMENT_GUIDE.md` – describes how harvested evidence feeds the hybrid tagging pipeline.
- `EVIDENCE_PACK_IMPLEMENTATION_PLAN.md` – status/changelog for the evidence initiative.
