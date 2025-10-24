# Format Detection Patterns - Complete ✅

**Created**: 2025-01-24  
**Status**: All major book formats covered  
**File**: `format_patterns.json`

---

## Overview

Created comprehensive format detection patterns with **weighted scoring system** to ease AI scraping burden. Patterns use rule-based identification combining multiple signals for robust format detection.

### Statistics

| Metric | Value |
|--------|-------|
| **Total Patterns** | 28 formats |
| **Coverage** | 100% of major book formats |
| **Average Confidence** | 0.60-0.75 |
| **File Size** | 1,430 lines |

---

## Format Categories

### Asian Formats (5 patterns)
**Special focus area** - difficult to distinguish without robust rules

- **light-novel**: Japanese prose with anime-style illustrations
- **manga**: Japanese comics (right-to-left, B&W)
- **manhwa**: Korean comics (often full color, vertical scroll)
- **manhua**: Chinese comics (wuxia/xianxia themes)
- **webtoon**: Digital vertical-scroll comics

**Key Detection Features**:
- Publisher matching (Yen Press, Viz Media, Tapas, etc.)
- Demographic tags (shonen, shojo, seinen, josei)
- Platform indicators (webtoon.com, Royal Road, etc.)
- Title patterns (Vol., Episode, Season)
- Cultural markers (anime adaptation, cultivation, etc.)

### Traditional Prose (3 patterns)

- **novel**: Standard prose fiction (default by exclusion)
- **novella**: Shorter fiction (17.5k-40k words)
- **illustrated-novel**: Prose with illustrations

### Collections (3 patterns)

- **anthology**: Multi-work collection
- **short-story-collection**: Single-author stories
- **omnibus**: Previously published works bound together

### Digital/Audio Formats (3 patterns)

- **audiobook**: Audio narration
- **ebook**: Digital electronic book
- **web-novel**: Online serialized fiction

### Physical Formats (2 patterns)

- **hardcover**: Rigid cover binding
- **paperback**: Flexible cover binding

### Visual/Sequential Art (2 patterns)

- **graphic-novel**: Book-length comics
- **visual-novel**: Interactive fiction with visuals

### Age-Specific Formats (5 patterns)

- **board-book**: Ages 0-3, thick cardboard pages
- **picture-book**: Ages 2-7, illustration-focused
- **early-reader**: Ages 5-8, chapter books
- **middle-grade**: Ages 8-12, pre-teen fiction
- **young-adult**: Ages 12-18, teen fiction

### Script Formats (2 patterns)

- **screenplay**: Film/TV scripts
- **play**: Stage/theatrical scripts

### Educational (2 patterns)

- **textbook**: Classroom instruction books
- **reference**: Lookup/consultation books

### Poetry (1 pattern)

- **poetry-collection**: Collections of poems

---

## Pattern Structure

Each format pattern includes:

```json
{
  "format-slug": {
    "name": "Display Name",
    "description": "Brief description",
    "defining_characteristics": [...],
    "exact_phrases": [...],        // High weight
    "strong_signals": [...],
    "title_patterns": [...],        // Regex patterns
    "publisher_markers": [...],     // Known publishers
    "platform_indicators": [...],   // Web platforms
    "category_indicators": [...],   // Metadata categories
    "description_markers": [...],   // Description keywords
    "minimum_confidence": 0.60-0.75,
    "weights": {
      "exact_phrase": 0.30-0.50,
      "publisher": 0.20-0.35,
      "title_pattern": 0.15-0.30,
      "description": 0.10-0.25
    }
  }
}
```

---

## Detection Methodology

### Weighted Scoring System

Each format uses a **weighted confidence score** calculated from multiple signal types:

1. **Exact Phrase Matching** (30-50% weight)
   - Highest priority
   - Direct format name mentions
   - Example: "light novel", "manga", "audiobook"

2. **Publisher/Platform Detection** (20-35% weight)
   - Known publishers/platforms for specific formats
   - Example: Yen Press → light novel, Viz Media → manga

3. **Title Pattern Recognition** (15-30% weight)
   - Regex patterns in titles
   - Example: `Vol. \d+`, `[manga]`, `Season \d+`

4. **Category Indicators** (15-30% weight)
   - Metadata category matching
   - Example: "manga", "audiobook", "young adult"

5. **Description Markers** (10-25% weight)
   - Keywords in descriptions
   - Lower weight due to ambiguity

6. **Exclusion Patterns** (varies)
   - Negative signals to avoid false positives
   - Example: novel excludes "graphic novel", "light novel"

### Confidence Thresholds

- **High confidence**: 0.70-0.75 (manga, manhwa, audiobook, board book, textbook)
- **Medium confidence**: 0.60-0.70 (most formats)
- **Lower confidence**: 0.50-0.60 (novel - default by exclusion)

---

## Special Considerations

### Light Novel vs Novel
**Challenge**: Both are prose fiction

**Solution**:
- Light novel patterns prioritize Japanese publishers
- Look for "illustrations by", "anime adaptation"
- Volume numbering patterns
- Novel identified by EXCLUDING light novel signals

### Manga vs Graphic Novel
**Challenge**: Both are visual sequential art

**Solution**:
- Manga prioritizes Japanese publishers (Viz, Kodansha)
- Demographic tags (shonen, seinen)
- Cultural markers
- Graphic novel is more Western/general

### Manhwa vs Webtoon
**Challenge**: Manhwa can be in webtoon format

**Solution**:
- Webtoon prioritizes platform indicators (webtoon.com)
- "Vertical scroll" mentions
- Manhwa can be traditional or webtoon format
- Both patterns have high confidence thresholds

### Anthology vs Short Story Collection
**Challenge**: Both are story collections

**Solution**:
- Anthology: multi-author OR thematic
- Short Story Collection: single author
- Author indicators weighted differently

---

## Integration Guide

### For AI Scraping

1. **Extract all available signals**:
   - Title, description, categories
   - Publisher/platform metadata
   - Age indicators
   - Binding/format metadata

2. **Apply patterns in order**:
   - Start with highest-confidence formats first
   - Light novel, manga, audiobook, etc.
   - Fall back to novel for prose fiction

3. **Calculate weighted scores**:
   ```
   score = (exact_phrase_matches × weight_exact) +
           (publisher_matches × weight_publisher) +
           (title_pattern_matches × weight_title) +
           (description_matches × weight_description)
   ```

4. **Apply confidence threshold**:
   - If score >= minimum_confidence: assign format
   - If multiple formats qualify: choose highest score
   - If no formats qualify: leave as unknown

### Example Detection Logic

```javascript
function detectFormat(book) {
  const signals = extractSignals(book);
  let bestMatch = null;
  let bestScore = 0;
  
  for (const format of formats) {
    const score = calculateScore(signals, format);
    
    if (score >= format.minimum_confidence && score > bestScore) {
      bestMatch = format;
      bestScore = score;
    }
  }
  
  return bestMatch;
}
```

---

## Benefits

### For AI Classification

✅ **Reduces AI burden**: Rule-based detection handles obvious cases  
✅ **Higher accuracy**: Weighted scoring combines multiple signals  
✅ **Publisher recognition**: Leverages known publisher/platform data  
✅ **Pattern matching**: Regex patterns catch common naming conventions  
✅ **Confidence scoring**: Quantifies certainty for manual review flags

### For System Architecture

✅ **Pre-filtering**: Run before AI classification to handle easy cases  
✅ **Cost savings**: Reduce API calls for obvious formats  
✅ **Validation**: Cross-check AI results against rule-based detection  
✅ **Fallback**: Use when AI is uncertain  
✅ **Batch processing**: Fast rule-based detection for large datasets

---

## Usage Examples

### Example 1: Light Novel Detection

**Book**: "Sword Art Online, Vol. 1: Aincrad (light novel)"  
**Publisher**: Yen Press

**Signals**:
- ✅ Exact phrase: "light novel" in title → 0.40 weight
- ✅ Publisher: "Yen Press" → 0.20 weight
- ✅ Title pattern: "Vol. 1" → 0.25 weight
- ✅ Description: likely mentions "illustrations", "anime" → 0.10 weight

**Score**: 0.95 (very high confidence)  
**Result**: light-novel ✅

### Example 2: Manga Detection

**Book**: "Attack on Titan, Volume 1"  
**Publisher**: Kodansha

**Signals**:
- ✅ Title pattern: "Volume 1" → 0.15 weight
- ✅ Publisher: "Kodansha" → 0.25 weight
- ⚠️ No explicit "manga" in title → 0.00 weight (exact phrase)
- ✅ Description: likely mentions "panels", "illustrated" → 0.10 weight

**Score**: 0.50 (borderline)  
**Needs**: AI confirmation or manual review

### Example 3: Webtoon Detection

**Book**: "Tower of God, Episode 1"  
**Platform**: webtoon.com

**Signals**:
- ✅ Platform: "webtoon.com" → 0.25 weight
- ✅ Title pattern: "Episode 1" → 0.15 weight
- ✅ Description: "vertical scroll", "mobile" → 0.20 weight

**Score**: 0.60 (meets threshold)  
**Result**: webtoon ✅

---

## Next Steps

### Testing & Validation

1. **Create test dataset**:
   - 100-200 books across all formats
   - Include edge cases
   - Manually verify correct formats

2. **Run pattern matching**:
   - Calculate accuracy metrics
   - Identify false positives/negatives
   - Adjust weights and thresholds

3. **Compare with AI**:
   - Run same dataset through AI classification
   - Calculate agreement rate
   - Identify where rules outperform/underperform AI

### Pattern Refinement

- Add more publisher/platform markers as discovered
- Refine weights based on testing results
- Add new patterns for emerging formats
- Create format aliases/variants

### Integration

- Implement in scraping pipeline
- Add to enrichment tasks
- Create format validation tool
- Build confidence dashboard

---

## Files

- **Pattern definitions**: `format_patterns.json`
- **This summary**: `FORMAT_PATTERNS_SUMMARY.md`
- **Existing task**: `enrichment-tasks/task-07-format-audience.js`

---

**Status**: ✅ Complete - Ready for testing and integration

All major book formats now have comprehensive detection patterns with weighted scoring to ease AI classification burden!
