# Handoff: Age/Audience Pattern Creation

## Task Overview
Create comprehensive age/audience detection patterns similar to the format and subgenre pattern systems. This will provide robust, weighted scoring rules for classifying books into age market segments during metadata scraping and enrichment.

## Current System State

### Existing Age Markets (from taxonomy-seed.ts lines 474-481)
```
adult                    → Adult (no age range specified)
new-adult-18-25          → New Adult (18–25)
young-adult-12-18        → Young Adult (12–18)
middle-grade-8-12        → Middle Grade (8–12)
children-8-12            → Children (8–12)
early-readers-5-8        → Early Readers (5–8)
```

**Note**: The taxonomy seed shows 6 age markets. The system likely also supports:
- `general-audience` (catch-all for all ages)
- Possibly others like `toddler`, `preschool`, `adult-25-plus`, etc.

**Action Required**: First determine the COMPLETE list of age markets from the actual taxonomy or database schema before creating patterns.

### Related Files
- **Schema**: `shared/schema.ts` (lines 232-251) - `age_markets` table definition
- **Current Detection**: `enrichment-tasks/task-07-format-audience.js` (lines 96-149) - Basic audience detection logic (young-adult, middle-grade, children, adult)
- **Format Patterns**: `format_patterns.json` - Template for pattern structure and weighted scoring methodology
- **Subgenre Patterns**: `subgenre_patterns.json` - Additional template reference

## Conservative Classification Rules

**CRITICAL: These rules MUST be followed exactly as specified by the user:**

### Rule 1: Uncertainty Defaults to Adult
> "If it is uncertain whether a child or teenage should view it, it needs to be adult"

When content appropriateness is ambiguous or questionable for younger audiences, always classify as `adult`.

### Rule 2: Universal Content = General Audience
> "If it is probably fine for anyone (regardless if they would see it or not) then it needs to be general audience"

Content suitable for all ages without concern should be classified as `general-audience`.

### Rule 3: Upward-Inclusive Tagging for Appropriate Content
> "You can have multiple age ranges if they all apply. So if it is a fantasy novel, and teenagers could view it, then they plus all the way up to adult+25 should all be tagged."

When content is appropriate for a particular age group, it should also be tagged for ALL OLDER age groups. Example:
- Book appropriate for teens → tag: `young-adult-12-18`, `new-adult-18-25`, `adult`
- Book appropriate for middle-grade → tag: `middle-grade-8-12`, `young-adult-12-18`, `new-adult-18-25`, `adult`

### Rule 4: Targeted Content Does NOT Tag Upward
> "However if it is targeted to a young audience then they would not tag all the way up to Adult 25+."

When content is specifically TARGETED at younger audiences (not just appropriate, but designed for them), only tag the target range. Example:
- Picture book targeted at toddlers → tag ONLY: `early-readers-5-8` (or appropriate young range)
- Middle-grade adventure targeted at 8-12 → tag ONLY: `middle-grade-8-12`

**Key Distinction**: 
- "Appropriate for" = tag upward (inclusive)
- "Targeted to" = tag ONLY the target range (exclusive)

### Rule 5: General Audience as Catch-All
> "General summary is a catch all (for all ages)"

`general-audience` should be used for truly universal content that has no age-specific concerns whatsoever.

## Pattern Creation Methodology

### File Structure
Create: `age_audience_patterns.json`

```json
{
  "metadata": {
    "version": "1.0.0",
    "created": "YYYY-MM-DD",
    "description": "Age/audience detection patterns with conservative classification rules and weighted scoring",
    "total_patterns": <count>,
    "classification_philosophy": "Conservative: uncertain → adult; universal → general-audience; appropriate → upward-inclusive; targeted → exclusive"
  },
  "patterns": {
    "slug-name": {
      "name": "Display Name",
      "age_range": "X–Y" or null,
      "tagging_strategy": "exclusive" | "upward-inclusive" | "universal",
      "defining_characteristics": [
        "Key characteristic 1",
        "Key characteristic 2"
      ],
      "exact_phrases": [
        "phrase indicating this age market",
        "another explicit phrase"
      ],
      "category_indicators": [
        "google books category pattern",
        "goodreads shelf pattern"
      ],
      "description_markers": {
        "strong": [
          "very strong indicator phrase",
          "explicit age mention"
        ],
        "moderate": [
          "somewhat indicative phrase"
        ],
        "weak": [
          "vague indicator"
        ]
      },
      "publisher_markers": [
        "publisher known for this age market"
      ],
      "exclusion_signals": [
        "indicator this is NOT this age market"
      ],
      "content_maturity_indicators": {
        "violence_level": "none|mild|moderate|graphic",
        "sexual_content": "none|implied|moderate|explicit",
        "language": "clean|mild|moderate|strong",
        "themes": ["mature theme 1", "mature theme 2"]
      },
      "minimum_confidence": 0.60,
      "weights": {
        "exact_phrase": 0.35,
        "category": 0.25,
        "description_strong": 0.20,
        "description_moderate": 0.10,
        "publisher": 0.05,
        "content_maturity": 0.05
      }
    }
  }
}
```

### Weighted Scoring System
Use similar methodology to `format_patterns.json`:

**Signal Types & Typical Weights:**
1. **Exact phrases** (30-40%) - Highest priority
   - "young adult", "ages 8-12", "early reader", etc.
   
2. **Category indicators** (20-30%) - Very strong
   - Google Books categories: "Juvenile Fiction", "Young Adult Fiction"
   - Goodreads shelves: "childrens", "ya", "middle-grade"
   
3. **Description markers** (20-30% combined) - Stratified
   - Strong markers (15-20%): explicit age mentions, target audience statements
   - Moderate markers (10-15%): thematic indicators, reading level mentions
   - Weak markers (5-10%): subtle clues
   
4. **Publisher markers** (5-15%)
   - Publishers known for specific age markets (e.g., Scholastic for children/YA)
   
5. **Content maturity indicators** (5-15%)
   - Violence level, sexual content, language, mature themes
   - Critical for conservative classification (uncertain → adult)
   
6. **Exclusion signals** (negative scoring)
   - Indicators that disqualify this age market
   - E.g., "explicit content" disqualifies children/YA markets

### Conservative Scoring Logic

**For uncertain cases, use these defaults:**
```json
{
  "adult": {
    "default_for_uncertainty": true,
    "minimum_confidence": 0.50,
    "note": "When content maturity is unclear or borderline, default to adult"
  },
  "general-audience": {
    "requires_explicit_indicators": true,
    "minimum_confidence": 0.70,
    "note": "Must have strong evidence of universal appropriateness"
  }
}
```

### Upward-Inclusive vs Exclusive Tagging

**Implementation Strategy:**

Each pattern should specify `tagging_strategy`:

1. **`"exclusive"`** - Targeted content, tag ONLY this range
   - Picture books for toddlers
   - Board books
   - Early readers with phonics focus
   - Middle-grade with age-specific curriculum themes
   
2. **`"upward-inclusive"`** - Appropriate content, tag this + all older ranges
   - YA fantasy without explicit content
   - Middle-grade adventure appropriate for teens
   - Content safe for age group but not exclusively targeted
   
3. **`"universal"`** - General audience, tag as general-audience
   - Classic literature with no age barriers
   - Non-fiction reference suitable for all ages
   - Content with zero maturity concerns

**Pattern Detection Order:**
1. First, detect ALL potentially applicable age markets
2. For each match, check `tagging_strategy`
3. If `"exclusive"`: return ONLY that age market
4. If `"upward-inclusive"`: return that age market + all older ranges
5. If `"universal"`: return `general-audience`
6. Apply conservative defaults when uncertain

## Pattern Examples (Reference)

### Example 1: Early Reader (Exclusive Tagging)
```json
"early-readers-5-8": {
  "name": "Early Readers (5–8)",
  "age_range": "5–8",
  "tagging_strategy": "exclusive",
  "defining_characteristics": [
    "Simple vocabulary and sentence structure",
    "Large print and illustrations",
    "Phonics and early reading skill focus",
    "Short chapters or sections"
  ],
  "exact_phrases": [
    "early reader",
    "ages 5-8",
    "beginning reader",
    "first reader"
  ],
  "category_indicators": [
    "juvenile fiction.*readers.*beginner",
    "children.*ages 4-8"
  ],
  "description_markers": {
    "strong": [
      "designed for early readers",
      "simple sentences",
      "phonics practice"
    ],
    "moderate": [
      "beginning chapter book",
      "illustrated story"
    ]
  },
  "minimum_confidence": 0.65
}
```

### Example 2: Young Adult (Upward-Inclusive Tagging)
```json
"young-adult-12-18": {
  "name": "Young Adult (12–18)",
  "age_range": "12–18",
  "tagging_strategy": "upward-inclusive",
  "defining_characteristics": [
    "Coming-of-age themes",
    "Teen protagonists",
    "Age-appropriate content (no explicit sexual content or graphic violence)",
    "Themes relevant to adolescence"
  ],
  "exact_phrases": [
    "young adult",
    "YA",
    "teen",
    "ages 12-18",
    "ages 12 and up"
  ],
  "category_indicators": [
    "young adult fiction",
    "teen.*fiction"
  ],
  "content_maturity_indicators": {
    "violence_level": "mild-to-moderate",
    "sexual_content": "none-to-implied",
    "language": "clean-to-mild",
    "themes": ["identity", "first love", "school", "friendship"]
  },
  "upward_inclusive_targets": [
    "new-adult-18-25",
    "adult"
  ],
  "minimum_confidence": 0.60
}
```

### Example 3: General Audience (Universal Tagging)
```json
"general-audience": {
  "name": "General Audience",
  "age_range": null,
  "tagging_strategy": "universal",
  "defining_characteristics": [
    "No age-specific content or concerns",
    "Appropriate for all ages",
    "Universal themes",
    "No maturity restrictions"
  ],
  "exact_phrases": [
    "all ages",
    "general audience",
    "suitable for everyone",
    "family-friendly"
  ],
  "content_maturity_indicators": {
    "violence_level": "none",
    "sexual_content": "none",
    "language": "clean",
    "themes": ["universal", "timeless", "educational"]
  },
  "minimum_confidence": 0.70
}
```

### Example 4: Adult (Conservative Default)
```json
"adult": {
  "name": "Adult",
  "age_range": null,
  "tagging_strategy": "exclusive",
  "defining_characteristics": [
    "Mature themes and content",
    "No age restrictions assumed",
    "Default when age appropriateness is uncertain"
  ],
  "exact_phrases": [
    "adult fiction",
    "mature audiences",
    "18+"
  ],
  "content_maturity_indicators": {
    "violence_level": "any",
    "sexual_content": "any",
    "language": "any",
    "themes": ["complex", "mature", "adult"]
  },
  "exclusion_signals": [
    "young adult",
    "children",
    "ages 5-8",
    "early reader"
  ],
  "default_for_uncertainty": true,
  "minimum_confidence": 0.50,
  "note": "Conservative default when content appropriateness for younger audiences is unclear"
}
```

## Implementation Steps

1. **Determine Complete Age Market List**
   - Query database or review schema for ALL age markets
   - Confirm slugs, names, and age ranges
   - Document any "general-audience" or "all-ages" category

2. **Create Pattern File Structure**
   - Create `age_audience_patterns.json`
   - Set up metadata section with version, description, philosophy
   - Initialize empty patterns object

3. **Design Conservative Classification Logic**
   - Define how uncertainty defaults to adult
   - Specify thresholds for content maturity indicators
   - Document when to use general-audience vs specific age markets

4. **Create Patterns for Each Age Market**
   - Start with youngest (early-readers, children)
   - Progress through middle-grade, YA, new-adult
   - End with adult and general-audience
   - For each pattern:
     - Define exact phrases and category indicators
     - Specify content maturity indicators
     - Set tagging strategy (exclusive/upward-inclusive/universal)
     - Assign appropriate weights
     - Set minimum confidence threshold

5. **Implement Upward-Inclusive Logic**
   - For patterns with `"upward-inclusive"` strategy
   - Add `upward_inclusive_targets` array listing older age markets
   - Document in metadata how this should be processed

6. **Validate Pattern Structure**
   - Ensure valid JSON
   - Confirm all required fields present
   - Check that weights sum appropriately
   - Verify conservative rules are encoded

7. **Create Documentation**
   - Create `AGE_AUDIENCE_PATTERNS_SUMMARY.md`
   - Explain conservative classification philosophy
   - Provide usage examples
   - Document integration with existing enrichment tasks
   - Include decision tree for uncertain cases

8. **Update Progress Tracking**
   - Update `TAXONOMY_PATTERNS_PROGRESS.md`
   - Add age/audience patterns section
   - Document completion status

9. **Commit and Push**
   - Commit pattern file
   - Commit documentation
   - Commit progress updates
   - Push to GitHub

## Key Considerations

### Content Maturity Detection
To implement conservative rules, patterns must detect:
- **Violence**: Keywords like "graphic violence", "brutal", "gore"
- **Sexual Content**: Keywords like "explicit", "steamy", "adult content", "erotica"
- **Language**: Keywords like "strong language", "profanity"
- **Themes**: Keywords like "addiction", "abuse", "trauma", "suicide"

When these indicators are present without clear age qualifiers → default to `adult`

### Publisher Intelligence
Leverage publisher knowledge:
- **Children's Publishers**: Scholastic, Penguin Young Readers, Disney Press
- **YA Publishers**: Tor Teen, Macmillan Children's, HarperTeen
- **Adult Publishers**: Tor Books, Penguin Random House (adult imprints)

### Category Pattern Recognition
Google Books categories are strong signals:
- `Juvenile Fiction / ...` → children or YA (check age in subcategory)
- `Young Adult Fiction / ...` → young-adult (upward-inclusive)
- `Fiction / ...` (without juvenile/YA) → likely adult

### Edge Cases
- **New Adult (18-25)**: Distinguish from YA by college setting, adult situations but young protagonist
- **Children (8-12) vs Middle-Grade (8-12)**: Same age range, may need merge or distinction based on marketing
- **Adult vs General-Audience**: Adult is default for mature/uncertain; general-audience requires positive evidence of all-ages appropriateness

## Success Criteria

- [ ] Complete age market list determined from taxonomy/database
- [ ] `age_audience_patterns.json` created with all age market patterns
- [ ] Conservative classification rules encoded in patterns
- [ ] Upward-inclusive vs exclusive tagging logic implemented
- [ ] Weighted scoring system defined for all patterns
- [ ] Content maturity indicators specified
- [ ] `AGE_AUDIENCE_PATTERNS_SUMMARY.md` documentation created
- [ ] All files validated (JSON structure, completeness)
- [ ] Changes committed to git with clear messages
- [ ] Progress tracking updated

## Questions to Resolve

1. Does `general-audience` exist as an age market slug, or is it implicit?
2. Are there age markets beyond the 6 listed in taxonomy-seed.ts (e.g., toddler, preschool, adult-25-plus)?
3. Should `children-8-12` and `middle-grade-8-12` be merged, or do they serve different purposes?
4. How should the system handle multi-generational content (e.g., Harry Potter - appropriate for middle-grade but read by adults)?
5. What is the precedence when a book matches multiple age markets with different tagging strategies?

## Files to Reference

- `format_patterns.json` - Template for pattern structure and weighted scoring
- `subgenre_patterns.json` - Additional pattern examples
- `enrichment-tasks/task-07-format-audience.js` - Existing basic detection logic
- `shared/schema.ts` - Database schema for age_markets table
- `api_disabled/taxonomy-seed.ts` - Current age market definitions
- `TAXONOMY_PATTERNS_PROGRESS.md` - Progress tracking

## Token Budget Note

This task consumed approximately 130k tokens in the previous session for:
- Subgenre pattern completion (549 patterns)
- Format pattern creation (28 patterns)

Age/audience patterns should be more straightforward:
- Estimated 6-10 age markets
- Each pattern will be comprehensive but less complex than genre patterns
- Target: ~20-30k tokens for pattern creation
- Target: ~10k tokens for documentation and validation

---

**Handoff Complete**: Next agent should begin by determining the complete list of age markets, then proceed with pattern creation following the conservative classification rules and methodology outlined above.
