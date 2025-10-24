# Age/Audience Patterns Summary

## Overview
The age/audience pattern system provides robust, weighted scoring for classifying books into age market segments during metadata scraping and enrichment. This system implements conservative classification rules with special emphasis on mature content detection.

**Version**: 1.0.0  
**Created**: 2025-10-24  
**Total Patterns**: 7  
**File**: `age_audience_patterns.json`

## Conservative Classification Philosophy

### Core Principles

1. **Uncertain → Adult**
   - When content appropriateness is ambiguous or questionable for younger audiences, default to `adult`
   - Borderline mature content → adult classification

2. **Universal → General Audience**
   - Content suitable for ALL ages without reservation → `general-audience`
   - Requires explicit positive indicators, not just absence of age markers

3. **Appropriate → Upward-Inclusive**
   - Content appropriate for an age group is also appropriate for older readers
   - YA appropriate for teens → also tag `new-adult-18-25` and `adult`
   - Example: Clean fantasy novel for 12+ → tags: `young-adult-12-18`, `new-adult-18-25`, `adult`

4. **Targeted → Exclusive**
   - Content specifically designed/marketed for young audiences → tag ONLY that range
   - Picture books for toddlers → tag ONLY `early-readers-5-8`
   - Middle-grade adventure → tag ONLY `middle-grade-8-12`

5. **Mature Content → Minimum New-Adult or Adult**
   - **CRITICAL RULE**: Sexually explicit content, pornographic content, spicy romance with on-page sex scenes, heavy violence, graphic content, suicide themes, self-harm, abuse, heavy profanity → minimum `new-adult-18-25` classification
   - Heavier/more extreme content → push to `adult` classification

## Age Market Definitions

### 1. Early Readers (5–8)
**Slug**: `early-readers-5-8`  
**Tagging Strategy**: Exclusive  
**Age Range**: 5–8 years

**Characteristics**:
- Simple vocabulary and sentence structure
- Large print with frequent illustrations
- Phonics and early reading skill focus
- Short chapters (typically under 10 pages)
- Absolutely clean content

**Indicators**:
- Phrases: "early reader", "beginning reader", "ages 5-8", "step into reading"
- Categories: "juvenile fiction...readers...beginner"
- Publishers: Scholastic Reader, I Can Read, Step Into Reading, Ready-to-Read
- Series: Step Into Reading, I Can Read, Level 1/2 readers

**Exclusions**: Middle grade, YA, teen, mature themes, complex content

### 2. Children (8–12)
**Slug**: `children-8-12`  
**Tagging Strategy**: Exclusive  
**Age Range**: 8–12 years

**Characteristics**:
- Age-appropriate for elementary/middle school children
- Child protagonists (8-12 years old)
- Simple to moderate complexity themes
- Clean language and content
- General children's category (overlaps with middle-grade)

**Indicators**:
- Phrases: "children 8-12", "ages 8-12", "children's fiction", "juvenile fiction"
- Categories: "juvenile fiction", "children...fiction"
- Publishers: Scholastic, Disney Press, Penguin Young Readers

**Exclusions**: YA, teen, mature themes, explicit content, violence

### 3. Middle Grade (8–12)
**Slug**: `middle-grade-8-12`  
**Tagging Strategy**: Exclusive  
**Age Range**: 8–12 years

**Characteristics**:
- Specifically targeted at middle-grade readers (ages 8-12)
- Protagonists typically 10-13 years old
- Coming-of-age themes appropriate for preteens
- Clean content with possible mild peril
- More complex than early readers but still age-appropriate

**Indicators**:
- Phrases: "middle grade", "middle-grade", "mg fiction", "tweens", "preteen"
- Categories: "juvenile fiction...social themes", "middle grade fiction"
- Publishers: Scholastic, Disney-Hyperion, Aladdin
- Series: Percy Jackson, Diary of a Wimpy Kid, Magic Tree House, Wings of Fire

**Exclusions**: YA, teen romance, mature themes, explicit content, graphic violence

### 4. Young Adult (12–18)
**Slug**: `young-adult-12-18`  
**Tagging Strategy**: Upward-Inclusive  
**Age Range**: 12–18 years

**Characteristics**:
- Teen protagonists (typically 14-18 years old)
- Coming-of-age themes relevant to adolescence
- Age-appropriate content (NO explicit sexual content or graphic violence)
- Can include mild romance (fade-to-black or closed door)
- Mild to moderate language acceptable

**Indicators**:
- Phrases: "young adult", "YA", "teen", "teen fiction", "ages 12-18"
- Categories: "young adult fiction", "teen...fiction"
- Publishers: Tor Teen, HarperTeen, Simon Pulse
- Series: Hunger Games, Twilight, Divergent, Throne of Glass

**Upward-Inclusive Targets**: `new-adult-18-25`, `adult`

**MATURE CONTENT OVERRIDE**:
- If explicit sex, graphic violence, heavy profanity, or suicide themes detected → OVERRIDE to `new-adult-18-25` or `adult`
- Triggers: "explicit", "steamy romance", "spicy", "on-page sex", "graphic violence", "gore", "detailed suicide", "heavy drug use", "18+"

### 5. New Adult (18–25)
**Slug**: `new-adult-18-25`  
**Tagging Strategy**: Upward-Inclusive  
**Age Range**: 18–25 years

**Characteristics**:
- Protagonists typically 18-25 years old (college age, early career)
- Adult situations with younger protagonist perspective
- **MINIMUM threshold for sexually explicit content**
- Can include mature themes: suicide, self-harm, abuse, addiction
- Can include heavy profanity and moderate-to-heavy violence
- College/university settings common

**Indicators**:
- Phrases: "new adult", "na fiction", "ages 18-25", "18+", "college romance"
- Categories: "new adult fiction", "college romance"
- Publishers: Avon, Berkley Romance, St. Martin's Press

**Upward-Inclusive Target**: `adult`

**MATURE CONTENT MINIMUM THRESHOLD** (30% weight):
- Sexual: "sexually explicit", "spicy romance", "steamy", "on-page sex", "sex scenes", "open door romance"
- Violence: "graphic violence", "heavy violence", "gore", "brutal"
- Profanity: "strong language", "heavy profanity", "explicit language"
- Themes: "suicide", "self-harm", "addiction", "substance abuse", "graphic abuse", "trauma"

**Push to Adult**: "extremely graphic", "pornographic", "hardcore", "bdsm", "kink", "erotica", "extreme violence"

### 6. Adult
**Slug**: `adult`  
**Tagging Strategy**: Exclusive  
**Age Range**: None (25+ assumed)

**Characteristics**:
- Mature themes and content for adult readers
- No age restrictions assumed
- **Conservative default when uncertain**
- Can include any level of sexual content, violence, profanity
- Complex themes, literary fiction, serious non-fiction
- Heavier/more graphic than new-adult threshold

**Indicators**:
- Phrases: "adult fiction", "mature audiences", "18+", "21+", "mature content"
- Categories: "fiction" (without YA/juvenile), "adult fiction", "literary fiction"
- Heavy mature content (30% weight)

**Heavy Mature Content Indicators**:
- Sexual: "erotica", "pornographic", "extremely explicit", "bdsm", "kink", "hardcore"
- Violence: "extremely graphic violence", "extreme gore", "torture", "snuff"
- Profanity: "pervasive profanity", "extremely vulgar"
- Themes: "graphic suicide", "extreme abuse", "sexual violence", "war atrocities"

**Default for Uncertainty**: Yes (minimum confidence 0.50)

### 7. General Audience
**Slug**: `general-audience`  
**Tagging Strategy**: Universal  
**Age Range**: None (all ages)

**Characteristics**:
- NO age-specific content or concerns whatsoever
- Appropriate for ALL ages without reservation
- Universal themes accessible to everyone
- Absolutely clean content
- Often educational, reference, or classic literature

**Indicators**:
- Phrases: "all ages", "general audience", "suitable for everyone", "family-friendly", "universal appeal"
- Categories: "reference", "education...general", "non-fiction...reference"
- Publishers: DK Publishing, National Geographic, Smithsonian

**Strict Requirements**:
- Must have explicit positive indicators of all-ages appropriateness
- Absence of age markers is NOT sufficient
- Requires HIGH confidence (0.75 minimum)
- Must have zero violence, sexual content, profanity, or mature themes

## Weighted Scoring Methodology

### Signal Types and Weights

Each pattern uses weighted scoring to calculate detection confidence:

1. **Exact Phrases** (30-40%)
   - Highest priority
   - Direct mentions: "young adult", "ages 8-12", "early reader"

2. **Category Indicators** (20-30%)
   - Very strong signals
   - Google Books categories: "Juvenile Fiction", "Young Adult Fiction"
   - Goodreads shelves: "childrens", "ya", "middle-grade"

3. **Description Markers** (15-30% combined)
   - Strong markers (15-20%): explicit age mentions, target audience statements
   - Moderate markers (10-15%): thematic indicators, reading level mentions
   - Weak markers (5-10%): subtle clues

4. **Publisher Markers** (5-15%)
   - Publishers known for specific age markets
   - Scholastic for children/YA, Tor Teen for YA, Berkley for NA/adult

5. **Mature Content Indicators** (5-30%)
   - CRITICAL for conservative classification
   - **Heavily weighted for new-adult (30%) and adult (30%)**
   - Sexual content, violence, profanity, mature themes

6. **Series Indicators** (5-10%)
   - Known series in specific age markets
   - Percy Jackson (MG), Hunger Games (YA), etc.

7. **Exclusion Signals** (negative)
   - Indicators that disqualify an age market
   - "explicit content" disqualifies children/YA

### Example Weight Distributions

**Early Readers**:
- Exact phrase: 40%, Category: 30%, Description (strong): 15%, Publisher: 10%, Series: 5%

**Young Adult**:
- Exact phrase: 35%, Category: 30%, Description (strong): 20%, Series: 10%, Content maturity: 5%

**New Adult** (with mature content emphasis):
- Exact phrase: 30%, Mature content triggers: 30%, Category: 20%, Description (strong): 15%, Publisher: 5%

**Adult** (with heavy mature content):
- Mature content heavy: 30%, Exact phrase: 25%, Category: 25%, Exclusion signals: 15%, Default: 5%

## Upward-Inclusive Tagging Implementation

### How It Works

1. **Detection**: Identify ALL potentially applicable age markets
2. **Strategy Check**: For each match, check `tagging_strategy`
3. **Exclusive**: Return ONLY that age market (targeted young content)
4. **Upward-Inclusive**: Return that market + all older ranges
5. **Universal**: Return `general-audience` only

### Examples

**Example 1: Clean YA Fantasy**
- Detected: `young-adult-12-18` with upward-inclusive strategy
- **Tags Applied**: `young-adult-12-18`, `new-adult-18-25`, `adult`
- Rationale: Appropriate for teens and older readers

**Example 2: Picture Book for Toddlers**
- Detected: `early-readers-5-8` with exclusive strategy
- **Tags Applied**: `early-readers-5-8` ONLY
- Rationale: Targeted specifically at young children

**Example 3: Spicy Romance Novel**
- Initial detection: YA category mention
- Mature content detected: "steamy", "explicit sex scenes"
- **Override triggered**: Classify as `new-adult-18-25` or `adult`
- **Tags Applied**: `new-adult-18-25`, `adult` (upward-inclusive from NA)

**Example 4: Middle-Grade Adventure**
- Detected: `middle-grade-8-12` with exclusive strategy
- **Tags Applied**: `middle-grade-8-12` ONLY
- Rationale: Specifically marketed to 8-12 age group

**Example 5: Reference Book**
- Detected: `general-audience` with universal strategy
- **Tags Applied**: `general-audience` ONLY
- Rationale: Truly universal content for all ages

## Mature Content Detection Rules

### Critical Triggers (Minimum New-Adult or Adult)

**Sexual Content**:
- "sexually explicit"
- "pornographic"
- "spicy romance"
- "steamy"
- "on-page sex"
- "sex scenes"
- "open door romance"
- "erotica"

**Violence**:
- "graphic violence"
- "heavy violence"
- "gore"
- "brutal"
- "extreme gore"
- "torture"

**Profanity**:
- "strong language"
- "heavy profanity"
- "explicit language"
- "pervasive profanity"

**Mature Themes**:
- "suicide"
- "self-harm"
- "addiction"
- "substance abuse"
- "graphic abuse"
- "trauma"
- "eating disorders"

### Threshold Logic

**Minimum New-Adult (18-25)**:
- ANY mature content trigger detected → classify as at least `new-adult-18-25`
- Moderate mature content → `new-adult-18-25` with upward-inclusive to `adult`

**Push to Adult (25+)**:
- Heavy/extreme mature content → classify as `adult`
- Multiple severe triggers
- Extremely graphic descriptions
- Erotica, hardcore, BDSM, kink
- Extreme violence, torture, snuff

### Override Logic for YA

If a book is detected as YA but contains mature content triggers:
1. Check for mature content indicators
2. If ANY triggers found → OVERRIDE classification
3. Classify as `new-adult-18-25` or `adult` instead
4. Apply upward-inclusive tagging from new classification

## Decision Tree for Uncertain Cases

```
Is content clearly targeted at young children (ages 5-8)?
├─ YES → early-readers-5-8 (exclusive)
└─ NO
    │
    Is content clearly targeted at children (ages 8-12)?
    ├─ YES → children-8-12 or middle-grade-8-12 (exclusive)
    └─ NO
        │
        Is content clearly targeted at teens (ages 12-18)?
        ├─ YES → Check for mature content
        │   ├─ Mature content detected → new-adult-18-25 or adult
        │   └─ Clean content → young-adult-12-18 (upward-inclusive)
        └─ NO
            │
            Does content have ANY mature content indicators?
            ├─ YES → new-adult-18-25 or adult (based on severity)
            └─ NO
                │
                Does content have EXPLICIT all-ages indicators?
                ├─ YES → general-audience (universal)
                └─ NO → adult (conservative default)
```

## Integration Guide

### Usage in Enrichment Pipeline

The age/audience patterns are designed to integrate with the existing enrichment system:

1. **Load Patterns**: Load `age_audience_patterns.json` at startup
2. **Score Each Pattern**: For each book, calculate confidence score for each age market pattern
3. **Apply Thresholds**: Keep patterns that meet minimum confidence threshold
4. **Check Mature Content**: Apply mature content override rules
5. **Apply Tagging Strategy**: 
   - Exclusive: Return only matched pattern
   - Upward-inclusive: Return matched pattern + older age markets
   - Universal: Return general-audience only
6. **Conservative Default**: If no clear match, default to `adult`

### Integration with Existing Detection

The patterns complement the existing detection in `task-07-format-audience.js`:

**Current Detection** (basic):
- Simple keyword matching
- Category indicators
- Returns single age market slug

**New Pattern System** (enhanced):
- Weighted scoring across multiple signal types
- Mature content detection with heavy weighting
- Upward-inclusive tagging logic
- Conservative classification rules
- Returns multiple age market slugs when appropriate

### Example Implementation

```javascript
function detectAgeMarkets(book, patterns) {
  const results = [];
  
  // Score each pattern
  for (const [slug, pattern] of Object.entries(patterns.patterns)) {
    const score = calculateScore(book, pattern);
    
    if (score >= pattern.minimum_confidence) {
      results.push({ slug, score, pattern });
    }
  }
  
  // Check for mature content overrides
  if (hasMatureContent(book)) {
    results = applyMatureContentOverride(results, book);
  }
  
  // Apply tagging strategy
  return applyTaggingStrategy(results);
}

function applyTaggingStrategy(results) {
  const tags = [];
  
  for (const result of results) {
    if (result.pattern.tagging_strategy === 'exclusive') {
      tags.push(result.slug);
    } else if (result.pattern.tagging_strategy === 'upward-inclusive') {
      tags.push(result.slug);
      tags.push(...result.pattern.upward_inclusive_targets);
    } else if (result.pattern.tagging_strategy === 'universal') {
      return [result.slug]; // Return only general-audience
    }
  }
  
  return tags.length > 0 ? [...new Set(tags)] : ['adult'];
}
```

## Confidence Thresholds

Different patterns have different minimum confidence requirements:

- **General Audience**: 0.75 (highest - requires explicit indicators)
- **Early Readers**: 0.70 (high - must be clearly targeted)
- **Children/Middle Grade**: 0.65 (medium-high - clear targeting needed)
- **Young Adult**: 0.60 (medium - common category)
- **New Adult**: 0.60 (medium - newer category)
- **Adult**: 0.50 (lowest - conservative default)

## Edge Cases and Considerations

### Multi-Generational Content
**Example**: Harry Potter
- Started as middle-grade but read by all ages
- Pattern detection: `middle-grade-8-12` (exclusive based on targeting)
- Real-world usage: Read by all ages regardless of tagging
- Classification: Respect the **targeted** audience (middle-grade), not the actual readership

### New Adult vs Young Adult
- **New Adult**: 18-25, college settings, adult situations, can include mature content
- **Young Adult**: 12-18, high school settings, age-appropriate content only
- **Key Distinction**: Mature content threshold (sexual, violence, profanity)

### Children vs Middle-Grade
- Both target 8-12 age range
- **Children**: More general category, may be educational
- **Middle-Grade**: Specific fiction category, coming-of-age themes
- Both use exclusive tagging strategy

### Adult vs General-Audience
- **Adult**: Default for mature/uncertain content
- **General-Audience**: Requires explicit all-ages indicators
- **Critical**: Do NOT default to general-audience; use adult instead

## Success Metrics

The age/audience pattern system is complete when:

- [x] All 7 age market patterns defined
- [x] Conservative classification rules encoded
- [x] Mature content triggers heavily weighted (30% for NA and adult)
- [x] Upward-inclusive tagging logic implemented
- [x] Exclusive tagging for targeted young content
- [x] Universal tagging for general-audience
- [x] Conservative default to adult when uncertain
- [x] Valid JSON structure
- [x] Comprehensive documentation created

## Files

- **Patterns**: `age_audience_patterns.json` (838 lines)
- **Documentation**: `AGE_AUDIENCE_PATTERNS_SUMMARY.md` (this file)
- **Handoff**: `HANDOFF_AGE_AUDIENCE_PATTERNS.md` (task specification)
- **Progress**: `TAXONOMY_PATTERNS_PROGRESS.md` (will be updated)

## Future Enhancements

Potential improvements for future iterations:

1. **Content Flag Integration**: Cross-reference with content_flags patterns (clean, explicit, graphic-violence)
2. **Publisher Intelligence**: Expand publisher markers with imprint-specific knowledge
3. **Series Detection**: Build series database for automatic classification
4. **AI Training Data**: Use these patterns to train/fine-tune AI models
5. **Feedback Loop**: Track misclassifications and refine patterns
6. **Age Range Expansion**: Consider adding more granular ranges (e.g., adult-25-40, adult-40-plus)

---

**Pattern System Complete**: Age/audience patterns ready for integration with book classification pipeline.
