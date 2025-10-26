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

## 🩺 Preflight Check
Run the connectivity sanity check before large batches (ensures DNS, TLS, and PG connectivity):

```bash
npm run doctor
```

The script resolves the Neon host, performs a TLS handshake, and opens/closes a Postgres connection. It exits non-zero if any step fails so you can fix issues before running the harvester.

## 🚀 Command
```bash
npm run harvest [batchSize]
```

- `batchSize` overrides the number of works to process for this invocation only (e.g., `npm run harvest -- 25`).
- Without a CLI argument, the harvester uses:
  - `HARVEST_BATCH_SIZE` env var, or
  - `10` as the final fallback.
- Concurrency defaults to `HARVEST_CONCURRENCY` (env) or `3`. Example:
  ```bash
  HARVEST_CONCURRENCY=5 npm run harvest -- 40
  ```
- The script always runs via `node --dns-result-order=ipv4first -r dotenv/config --import tsx …` to avoid `tsx` IPC pipe issues and AAAA DNS delays.

## 🔄 Sync Evidence Into Enrichment Files
After harvesting, copy the latest `source_snapshots` into the enrichment JSON used by the micro-task pipeline:

```bash
npm run evidence:sync -- <book-id>
```

- Pass a `books.id` (from `books_batch_*.json`); the script resolves the corresponding `works.id` via `editions.legacy_book_id`.
- You can also pass `--work <work-id>` if you already have the work UUID.
- The script writes an `evidence` block into `enrichment_data/<book-id>.json` containing snapshot IDs, licenses, and extracts so downstream tasks (LLM prompts, Task 6) can cite provenance.
- Task 6 (cross-tags) reads this block and attaches `provenance_snapshot_ids` to each tag; Task 8 then stores those IDs in `book_cross_tags.source_ids`.

## 🧩 Apply Enrichment Directly to the Database
Skip manual SQL by applying enrichment JSON through Drizzle:

```bash
npm run enrichment:apply -- <book-id>
```

- Rewrites `books` (authors, summary, cover), domain/supergenre/genre/subgenre links, cross-tags (with `confidence`, `method`, `source_ids`), format, and audience.
- Pass `--dry-run` to preview steps without writing.
- Re-run after any manual edits to `enrichment_data/<book-id>.json` to keep Neon in sync.

## 📋 Workflow
1. **Select candidates**: Queries `works` ordered by `updated_at`, filters by `needsReharvest` (missing snapshots or stale > `EVIDENCE_STALE_DAYS`).
2. **Fetch evidence** (per work):
   - OpenLibrary: resolves ISBN via editions, pulls work/edition metadata, subjects, cover hints.
   - Wikipedia: resolves page title (via Wikidata if available) and fetches intro extract+revision.
   - Google Books: uses ISBN/legacy `books` data to capture long-form descriptions + subject categories (stored as `googlebooks` snapshots) so every work has at least one extract with provenance.
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
