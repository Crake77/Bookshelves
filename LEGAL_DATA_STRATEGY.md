# Legal Data Sourcing & Cover Strategy

## Overview
This document outlines the legal, scalable approach for sourcing book metadata and covers for Bookshelves.

## Core Principles
1. **CC0/Public Domain First** - Store and remix freely
2. **Respect Rate Limits** - Use OLID/CoverID to avoid limits
3. **Attribution Where Required** - Google Books needs branding/links
4. **Track Provenance** - Know where every field came from

---

## 1. Data Sources (Priority Order)

### Primary: Open Library (CC0)
- **License**: CC0 (public domain equivalent)
- **What to use**: Works, editions, authors, ISBNs, subjects
- **How**: Monthly bulk dumps + API enrichment
- **Links**:
  - Bulk dumps: https://openlibrary.org/data
  - Books API: https://openlibrary.org/dev/docs/api/books
  - Covers API: https://openlibrary.org/dev/docs/api/covers

### Secondary: Wikidata (CC0)
- **License**: CC0 for structured data
- **What to use**: Alternative IDs (Q-IDs), series info, birth/death dates, languages, subjects
- **How**: Map OLID/ISBN ↔ Wikidata Q-ID via sitelinks
- **Link**: https://www.wikidata.org/wiki/Wikidata:Licensing

### Tertiary: BookBrainz (CC0)
- **License**: CC0 for core data, CC BY-SA for other data
- **What to use**: Long-tail bibliographic gaps
- **Link**: https://bookbrainz.org/licensing

### Optional: ONIX Feeds (Contractual)
- **License**: Requires publisher/distributor agreements
- **What to use**: Pricing, formats, marketing copy, territory rights, accessibility metadata
- **Providers**: Edelweiss, Ingram
- **Note**: Only if you need commercial-grade completeness
- **Link**: https://bic.org.uk (ONIX standards)

### Avoid/Use Carefully
- **Internet Archive scans**: Restrictive terms, use for links/previews only with attribution
- **Google Books content**: Requires branding guidelines compliance, don't cache long-term

---

## 2. Covers Strategy (CRITICAL)

### ✅ Primary: Open Library Covers API (OLID/CoverID)
**Why**: No rate limits, CC0-friendly

**Rate Limits**:
- OLID (Open Library ID): **NO LIMIT** ✅
- CoverID: **NO LIMIT** ✅  
- ISBN/OCLC/LCCN: **100 requests per IP per 5 minutes** ⚠️

**URL Pattern**:
```
https://covers.openlibrary.org/b/olid/{OLID}-{SIZE}.jpg
https://covers.openlibrary.org/b/id/{CoverID}-{SIZE}.jpg
```

**Sizes**: S (small/thumbnail), M (medium), L (large)

**Best Practices**:
1. Store OLID/CoverID in database, NOT full URLs
2. Load thumbnails directly from client (not proxied through your server)
3. Use `loading="lazy"` in HTML
4. Add `?default=false` to return 404 instead of blank image
5. Courtesy link back to Open Library (footer or book page)

**Example**:
```html
<img src="https://covers.openlibrary.org/b/olid/OL24514166M-L.jpg?default=false" 
     loading="lazy" 
     alt="Book cover" />
```

### ⚠️ Fallback: Google Books (Requires Attribution)
**Only if**: You accept Google's branding requirements

**Requirements**:
- Must display "Powered by Google" logo
- Must link back to Google Books
- Cannot reorder/alter results
- Don't cache long-term or repurpose
- Link: https://developers.google.com/books/branding

**Recommendation**: Skip Google Books to keep licensing simple unless you need comprehensive coverage.

---

## 3. Data Model (Works/Editions Split)

### Works Table
```sql
- id (uuid)
- title (text)
- canonical_title (text, normalized)
- openlibrary_work_olid (text, indexed)
- wikidata_qid (text)
- earliest_pub_date (date)
- summary_text (text)
- summary_source (text: 'ai'|'ol'|'wikidata')
- summary_license (text: 'cc0'|'generated')
- subjects (text[])
- created_at, updated_at
```

### Editions Table
```sql
- id (uuid)
- work_id (uuid, FK)
- openlibrary_edition_olid (text, indexed)
- isbn13 (text, indexed)
- isbn10 (text)
- format (text)
- publisher (text)
- pub_date (date)
- page_count (int)
- language (text)
- cover_provider ('ol'|'gb'|'pd')
- cover_id (text, OLID or CoverID)
- cover_url (text, computed from cover_id)
- created_at, updated_at
```

### Contributors Table
```sql
- id (uuid)
- name (text)
- openlibrary_author_olid (text)
- wikidata_qid (text)
- birth_date, death_date
```

### Work_Contributors Junction
```sql
- work_id (uuid)
- contributor_id (uuid)
- role (text: 'author'|'editor'|'translator'|etc)
```

### Identifiers Table
```sql
- entity_id (uuid)
- entity_type ('work'|'edition')
- identifier_type (text: 'oclc'|'lccn'|'asin'|'goodreads')
- identifier_value (text)
```

### Provenance Table
```sql
- entity_id (uuid)
- field_name (text)
- source (text: 'ol'|'wikidata'|'bookbrainz'|'onix'|'ai')
- confidence (numeric 0.0-1.0)
- fetched_at (timestamp)
```

---

## 4. Ingestion Workflow

### Step 0: Seed from Open Library Bulk Dumps
- Download monthly dumps: works, editions, authors
- Normalize ISBNs: convert ISBN-10 → ISBN-13, strip hyphens
- Store OLID, ISBN13, basic metadata

### Step 1: ID Resolution
- Attach Open Library OLIDs
- Map to Wikidata Q-IDs via sitelinks
- Cross-reference ISBNs

### Step 2: Metadata Enrichment
- Pull page_count, formats, publisher, pub_date from OL JSON API
- Optionally enrich from ONIX feeds (if contracted)
- Pull subjects from Wikidata (CC0)

### Step 3: Covers Pass
- Compute `cover_url` from OLID/CoverID
- **Never** use ISBN-based URLs in production (rate limits)
- Only add Google Books thumbnail if you accept attribution requirements

### Step 4: Summaries
- **DO NOT** copy publisher blurbs wholesale (copyright risk)
- Generate 60-120 word clean synopsis with LLM from CC0 facts
- Source from: Open Library descriptions, Wikidata, user notes
- Store `summary_source='ai'`, `summary_license='generated'`
- Keep prompt traces for transparency

### Step 5: Provenance Tracking
- For every enriched field, store source + confidence
- Display highest-confidence value
- Keep alternatives for admin review

---

## 5. Quality & Merge Rules

### Identifiers
- Exact ISBN-13 match wins
- Use OL work↔edition mapping
- Never merge across different ISBN-13 unless verified reprint/format mapping

### Dates
- Store `earliest_pub_date` on work (original publication)
- Store `pub_date` on edition (this edition's publication)
- Display "new release" based on edition date
- Handles re-releases correctly

### Page Counts
- Prefer OL edition page_count
- Backfill from Wikidata/ONIX
- Flag when counts disagree by >10%

---

## 6. Production Best Practices

### Rate Limit Management
- **Always** use OLID/CoverID URLs (unlimited)
- **Never** use ISBN/OCLC/LCCN URLs in carousels (100/5min limit)
- Load cover images client-side (not server-proxied)
- Cache with ETag/Last-Modified headers

### Performance
- Request small thumbnails for lists/carousels
- Load medium/large only on detail pages
- Use `loading="lazy"` attribute
- Keep local placeholder for layout stability

### Attribution
- Link back to Open Library in footer or per-book
- If using Google Books: display "Powered by Google" + link
- Document all data sources in About page

---

## 7. Current Implementation Status

### ✅ Completed
- Open Library Covers API integration
- OLID/CoverID support
- Title/author search fallback
- Cover validation and comparison

### 🚧 In Progress
- Bulk dump ingestion pipeline
- Wikidata Q-ID mapping
- Works/editions split in schema

### 📋 Planned
- Provenance tracking table
- Confidence scoring system
- Automated ISBN normalization
- ONIX feed integration (if needed)

---

## References

- [Open Library Data](https://openlibrary.org/help/faq/using)
- [Open Library Covers API](https://openlibrary.org/dev/docs/api/covers)
- [Open Library Bulk Dumps](https://openlibrary.org/data)
- [Wikidata Licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
- [BookBrainz Licensing](https://bookbrainz.org/licensing)
- [Google Books Branding](https://developers.google.com/books/branding)
- [ONIX Standards](https://bic.org.uk/)
