# Bookshelves Complete Taxonomy Reference

**Version:** 1.0.0  
**Exported:** 2025-10-23  
**Database:** Bookshelves Production (Neon DB)  
**Total Metadata Items:** 3,368

---

## 📊 Summary Statistics

| Category | Count | Description |
|----------|-------|-------------|
| **Genres** | 101 | Top-level book categorization |
| **Subgenres** | 500 | Detailed genre subdivisions |
| **Supergenres** | 34 | High-level genre groupings |
| **Cross-tags** | 2,733 | Multi-dimensional metadata tags |
| **Genre-Supergenre Links** | 117 | Hierarchical relationships |

---

## 🏷️ Cross-Tags Breakdown by Group

Cross-tags provide rich, multi-dimensional metadata for books across various aspects:

| Group | Count | Purpose |
|-------|-------|---------|
| **trope** | 1,226 | Narrative patterns and storytelling devices |
| **representation** | 305 | Identity, diversity, and representation tags |
| **plot** | 284 | Plot structures and narrative elements |
| **tone** | 195 | Overall mood and atmosphere |
| **content_warning** | 190 | Sensitive content flags |
| **style** | 139 | Writing style and literary techniques |
| **tropes_themes** | 106 | Thematic elements |
| **content_flags** | 72 | Additional content descriptors |
| **setting** | 65 | Time, place, and world-building |
| **tone_mood** | 55 | Emotional tone variations |
| **market** | 55 | Marketing and audience tags |
| **structure** | 41 | Narrative structure types |

---

## 📚 Genre Categories (101 Total)

### Religion & Spirituality (15 genres)
- Buddhism
- Christianity  
- Confucianism
- Hinduism
- Islam
- Jainism
- Judaism
- Latter-day Saints
- Bahai Faith (Bahá'í)
- Shinto
- Sikhism
- Taoism
- Religious Fiction

### General Categories
- Fiction (multiple subcategories)
- Non-Fiction (multiple subcategories)
- Reference
- Pets & Animals
- And 84+ more specialized genres...

---

## 📖 Subgenres (500 Total)

Subgenres provide granular classification within each genre. Examples:

### Christianity (8 subgenres)
- Apologetics & Evangelism
- Bible Studies
- Christian Living
- Christian Poetry
- Christian Theology
- Church History
- Devotional
- Sermons

### Islam (6 subgenres)
- Hadith Studies
- Islamic History
- Islamic Law (Sharia)
- Islamic Theology (Aqidah)
- Quran Studies
- Sufism

### Buddhism (5 subgenres)
- Buddhist History
- Buddhist Meditation & Practice
- Buddhist Philosophy
- Buddhist Scriptures (Sutras)
- Zen

*Plus 481 additional subgenres across all other genres...*

---

## 🌟 Supergenres (34 Total)

Supergenres group related genres into broader categories for navigation and discovery:

- Fiction Supergenres (e.g., "Fantasy & Science Fiction", "Mystery & Thrillers")
- Non-Fiction Supergenres (e.g., "History & Social Sciences", "Self-Help & Wellness")
- Religion & Spirituality
- Reference & Education
- And 30+ more high-level groupings...

---

## 🔗 Taxonomy Relationships

### Genre → Supergenre Links (117 total)
Genres are linked to one or more supergenres to create hierarchical browsing:
- Most religion genres → "Religion & Spirituality" supergenre
- "Religious Fiction" → "Inspirational & Religious Fiction" supergenre
- "Reference" → "Reference & Education" supergenre
- And 114+ more relationships...

### Genre → Subgenre Links (500 total)
Each of the 500 subgenres belongs to exactly one parent genre.

---

## 🎯 Use Cases for Research Agent

### 1. **Metadata Enrichment**
When scraping book data from the internet, use this taxonomy to:
- Normalize genre classifications across different sources
- Add granular subgenre tags based on book descriptions
- Apply relevant cross-tags for themes, tropes, tone, representation, etc.

### 2. **Content Analysis**
Use cross-tags to analyze and categorize:
- **Tropes** (1,226 tags): Identify narrative patterns (e.g., "chosen-one", "enemies-to-lovers", "time-travel")
- **Representation** (305 tags): Diversity and identity tags
- **Content Warnings** (190 tags): Sensitive content detection
- **Tone** (195 tags): Mood and atmosphere classification
- **Plot** (284 tags): Story structure and narrative devices

### 3. **Smart Categorization**
Apply multiple layers of classification:
1. **Genre** (broad category)
2. **Subgenre** (specific niche)
3. **Supergenre** (high-level grouping)
4. **Cross-tags** (multi-dimensional attributes)

### 4. **Search & Discovery Optimization**
Use taxonomy to:
- Generate similar book recommendations
- Build faceted search interfaces
- Create themed collections and reading lists
- Enable advanced filtering by multiple attributes

---

## 📁 Data Files

### Complete JSON Export
**File:** `bookshelves_complete_taxonomy.json`
**Format:** Structured JSON with full details
**Size:** ~3,368 items

**Structure:**
```json
{
  "metadata": { ... },
  "summary": { ... },
  "genres": [ { "id", "slug", "name", "description" } ],
  "subgenres": [ { "id", "slug", "name", "genre_slug", "genre_name", ... } ],
  "supergenres": [ { "id", "slug", "name", "description" } ],
  "cross_tags": {
    "by_group": {
      "trope": [ { "id", "slug", "name", "group", "description" } ],
      "representation": [ ... ],
      ...
    }
  },
  "genre_supergenre_links": [ { "genre_slug", "supergenre_slug", ... } ]
}
```

---

## 🤖 Instructions for Research Agent

When scraping book metadata from the internet:

1. **Match to Existing Taxonomy**
   - Map source genre names to our 101 standardized genres
   - Identify applicable subgenres from our 500 options
   - Link to appropriate supergenres

2. **Apply Cross-Tags**
   - Extract themes/tropes from book descriptions and reviews
   - Identify representation tags from character descriptions
   - Detect content warnings from summaries
   - Classify tone/mood from writing style indicators
   - Tag plot devices and narrative structures

3. **Quality Control**
   - Prefer official publisher metadata when available
   - Cross-reference multiple sources (Goodreads, Amazon, Google Books, etc.)
   - Use confidence scores for automated tags
   - Flag ambiguous classifications for human review

4. **Normalization**
   - Convert all genre names to our slug format (e.g., "Sci-Fi" → "science-fiction")
   - Handle variations (e.g., "Fantasy" vs "Fantastical Fiction")
   - Map proprietary category systems to our taxonomy

5. **Enrichment Priority**
   1. Genre + Subgenre (required)
   2. Supergenre linking (recommended)
   3. Top 5-10 most relevant cross-tags (recommended)
   4. Full cross-tag set (optional, for deep metadata)

---

## 🔄 Version History

- **v1.0.0** (2025-10-23): Initial complete taxonomy export
  - 101 genres
  - 500 subgenres
  - 34 supergenres
  - 2,733 cross-tags
  - 117 hierarchical links

---

## 📞 Support

For questions or taxonomy updates, contact the Bookshelves development team.

**Data Source:** Neon PostgreSQL Database  
**Export Tool:** `export_taxonomy.js`  
**Last Updated:** 2025-10-23T03:27:00Z
