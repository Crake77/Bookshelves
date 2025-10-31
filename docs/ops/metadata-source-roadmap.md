# Metadata Enrichment – External Source Roadmap

**Owner:** Data enrichment team  
**Last updated:** 2025-10-31  
**Status:** Draft → Adopt as execution playbook once adapters land

---

## 1. Objectives

- **Improve tag quality** – reduce false positives from pattern heuristics by seeding enrichment with authoritative subject vocabularies.
- **Broaden coverage** – auto-populate taxonomy fields (subjects, genres, settings, formats, audiences, related entities) before running LLM/pattern passes.
- **Maintain provenance** – every imported signal must cite its source id/URL to keep audit trails intact.
- **Respect licensing** – ingest only data that is public-domain or allowed for reuse with attribution; document compliance up front.

---

## 2. Target Source Inventory

| Priority | Source | Data Available | Access | License / Notes |
|----------|--------|----------------|--------|-----------------|
| P0 | **Library of Congress** (id.loc.gov / SRU) | LCSH subjects, genre/form, summaries | REST JSON, SRU | US Gov (public domain) |
| P0 | **OCLC FAST** | Faceted subjects (cleaned LCSH) | REST JSON, requires API key | Free key, reuse with attribution |
| P0 | **Wikidata / Wikipedia** | Main subject (`P921`), genre (`P136`), topics, related works | SPARQL & REST, no auth | CC0 |
| P1 | **CrossRef** | DOI metadata (subjects, abstracts, keywords) | REST JSON, no auth | Bibliographic data PD; abstract use allowed for parsing |
| P1 | **OpenAlex** | Scholarly concepts, fields, citations | REST JSON | CC0 |
| P1 | **Publisher BISAC/ONIX** | BISAC codes, marketing copy | Scrape ONIX feeds or publisher APIs | Respect individual site TOS |
| P2 | British Library / BNF | Subject headings, class marks | SRU/REST | Public domain (verify per institution) |
| P2 | Semantic Scholar | Academic keywords & topics | REST JSON | CC BY-NC; restrict to non-commercial processing |

> **Legend:** P0 = initial implementation wave, P1 = second wave, P2 = backlog candidates.

---

## 3. Architecture Overview

```
                ┌──────────────────────────┐
                │ enrichment_data/<book>.json
                │ (pre-existing metadata) │
                └─────────────┬────────────┘
                              │
            ┌─────────────────▼──────────────────┐
            │ Adapter Orchestrator               │
            │  - Loads book identifiers (ISBN,   │
            │    title, authors, DOIs)           │
            │  - Calls registered adapters       │
            │  - Collects normalized subjects    │
            └─────────────┬────────────┬─────────┘
                          │            │
                 ┌────────▼───┐ ┌──────▼────┐
                 │ Source A    │ │ Source B   │ … (*n*)
                 │ (LoC)       │ │ (Wikidata) │
                 └─────┬──────┘ └─────┬──────┘
                       │              │
             ┌─────────▼──────────────▼──────┐
             │ Normalization & Merge Layer   │
             │  - Slug mapping                │
             │  - Confidence scoring          │
             │  - Provenance bundling         │
             └─────────┬───────────────┬─────┘
                       │               │
         ┌─────────────▼──────┐ ┌──────▼────────┐
         │ Enrichment Writer  │ │ LLM / Pattern  │
         │  - Injects subjects│ │ fallback passes│
         │    into taxonomy   │ └────────────────┘
         └─────────────┬──────┘
                       │
         ┌─────────────▼─────────────┐
         │ enqueue apply-to-db       │
         │ (book_cross_tags, etc.)   │
         └───────────────────────────┘
```

---

## 4. Adapter Contract (`metadata/adapters/*.ts`)

- `async lookup({ isbn, issn, oclc, doi, title, authors }): Promise<AdapterResult>`
- **AdapterResult**
  ```ts
  type AdapterResult = {
    labels: Array<{
      slug: string;          // normalized slug (see §5)
      name: string;          // human readable
      source: 'loc' | 'fast' | 'wikidata' | ...;
      confidence: 'high' | 'medium' | 'low';
      kind: 'genre' | 'topic' | 'setting' | 'audience' | 'format' | 'person' | 'place';
      raw: any;              // original payload for audit/debug
      id?: string;           // e.g., LCSH URI, FAST number, QID
      url?: string;          // canonical link
    }>;
    notes?: string[];
  };
  ```
- Adapters must:
  - Respect configured request throttle (`adapterConfig.rateLimit`).
  - Cache responses in `.cache/<source>/<id>.json`.
  - Throw a descriptive error only for fatal issues (auth, malformed responses); soft failures should return `{ labels: [], notes: [...] }`.

---

## 5. Normalization Rules

1. **Slug generation**
   - Precedence: taxonomy mapping > alias mapping > slugify string.
   - `slugify(value)` → lower-case, replace non-alphanumerics with `-`, collapse repeats.
2. **Mapping tables**
   - `locToSlug.json`, `fastToSlug.json`, `wikidataToSlug.json` maintained under `metadata/mappings/`.
   - If no direct match, queue slug under `metadata/review/new-subjects.json` for editorial triage.
3. **Confidence scoring**
   - Default `high` when mapping exists and source confidence ≥ recommended threshold (e.g., FAST heading matched by ID).  
   - Downgrade to `medium` when mapping is fuzzy (title-based match).  
   - Set `low` for heuristics (e.g., partial label match).
4. **Deduplication**
   - Merge identical slugs by taking highest confidence, union provenance IDs.
   - Track `sources: string[]` for transparency.

---

## 6. Implementation Phases

### Phase A – Infrastructure
1. Create package `metadata/` with:
   - `adapters/` directory scaffold.
   - Shared helper: request client with retries, caching, logging.
   - Normalization utilities & slug mappings.
2. Add config file `metadata/config.ts` for API keys, rate limits, default timeouts.
3. Extend enrichment pipeline:
   - New step `collectExternalSubjects(book)`.
   - Merge results into `enrichment_data/<book>.json` before LLM/pattern stages.

### Phase B – Adapter Wave 1 (P0 sources)
1. **LoC Adapter**
   - Use id.loc.gov JSON when URI known; fallback to SRU search by ISBN/title.
   - Extract: `lcsh`, `genreForm`, `summary`.
2. **FAST Adapter**
   - Requires `FAST_API_KEY`.
   - Query by OCLC, ISBN, or text; return `heading`, `type`, `id`.
3. **Wikidata Adapter**
   - Query by ISBN/DOI (properties `P212`, `P356`) or title + author.
   - Collect `P921` (main subject), `P136` (genre), `P180` (depicts), `P495` (country of origin), etc.
   - Keep SPARQL queries conservative to avoid timeouts.

### Phase C – Adapter Wave 2 (P1 sources)
4. **CrossRef Adapter**
   - DOI lookup; parse `subject`, `container-title`, `publisher`.
5. **OpenAlex Adapter**
   - Works keyed by DOI; gather `concepts`, `fieldsOfStudy`, `related_works`.
6. **BISAC / ONIX Ingestor**
   - Parse publisher feeds (if available) or public HTML with rate-limited scraping.
   - Map BISAC codes to taxonomy.

### Phase D – QA & Rollout
7. Implement adapter test harness:
   - Golden records for 10 fiction + 10 nonfiction titles.
   - Snapshot tests comparing expected slugs.
8. Integrate into `npm run enrichment:apply` workflow:
   - Option flags `--sources=loc,fast,wikidata`.
   - Retry queue for rate-limit or timeout errors.
9. Documentation & tooling:
   - Update `docs/ops/harvest-runbook.md`.
   - Create dashboard (simple CLI report) summarizing new slugs, confidence distribution, missing mappings.
10. Gradual deployment:
   - Re-run enrichment for pilot batch (existing 10 books).
   - Review diffs, adjust mappings.
   - Scale to rest of catalog once stable.

---

## 7. Compliance Checklist

- Maintain `metadata/LICENSE_NOTES.md` documenting each source’s reuse terms, links, and required attribution.
- Ensure caches store timestamp + request URL for auditing.
- Respect robots.txt or published rate limits when scraping publisher ONIX feeds.
- For any CC-by or CC-by-nc data (e.g., Semantic Scholar), add attribution fields and restrict usage appropriately.

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Average cross-tag false-positive rate (manual spot check) | ↓ by 70% |
| Books with ≥5 high-confidence subjects pre-LLM | ≥ 80% |
| New taxonomy slugs needing editorial review | ≤ 5 per 100 books |
| Adapter failure rate (5xx or empty) | < 10% (auto retries before report) |

---

## 9. Open Questions / Next Decisions

- Do we cache adapter responses in git or external storage (e.g., S3/R2)? (Recommend local `.cache` gitignored.)
- For FAST API key management, will we centralize in `.env` or use Vercel secrets? (Decision pending.)
- Need alias-mapping workflow: who approves new slug mappings and how are they versioned?
- Should we ingest Wikidata statements beyond subjects (e.g., series membership, awards) in this pass or defer?

---

## 10. Action Items

- [ ] Scaffold `metadata/` module + helper utilities.
- [ ] Implement LoC adapter + mapping file.
- [ ] Implement FAST adapter (obtain API key).
- [ ] Implement Wikidata adapter with SPARQL query templates.
- [ ] Wire adapters into enrichment step (feature-flagged).
- [ ] Draft MVP tests + CLI report for merged subjects.
- [ ] Pilot run on 10-book cohort, review results before batch re-enrichment.
