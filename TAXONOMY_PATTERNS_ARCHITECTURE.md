# Taxonomy Pattern Matching Architecture

## Overview

The Bookshelves taxonomy has **5 hierarchical levels** that require different matching strategies:

1. **Domains** (4 items): fiction, non-fiction, poetry, drama
2. **Supergenres** (34 items): Broad categorical groupings
3. **Genres** (101 items): Specific genre classifications
4. **Subgenres** (500 items): Specialized niche categories
5. **Cross-tags** (2,733 items): Multi-dimensional descriptors

## Design Philosophy

### Hierarchy Requirements

**Higher-level taxonomies (Domains, Supergenres, Genres) require MORE SOPHISTICATED matching than cross-tags** because:

1. **Higher stakes**: Mis-classifying genre is worse than missing a trope
2. **Mutual exclusivity**: Books typically have 1 domain, 1-2 supergenres, but 10-20 cross-tags
3. **Structural requirements**: Genres have narrative patterns, not just keywords
4. **Confidence requirements**: Need 80-95% confidence for genre, 60-70% for cross-tags

### Pattern Complexity by Level

```
Domain (MOST COMPLEX)
  ├─ Narrative structure analysis
  ├─ Content type detection  
  ├─ Format indicators
  └─ Language pattern recognition

Supergenre (HIGH COMPLEXITY)
  ├─ Thematic clustering
  ├─ Genre family relationships
  ├─ Market positioning signals
  └─ Broad content indicators

Genre (MEDIUM-HIGH COMPLEXITY)
  ├─ Specific trope patterns
  ├─ Typical plot structures
  ├─ Character archetypes
  ├─ Setting requirements
  └─ Subgenre relationships

Subgenre (MEDIUM COMPLEXITY)
  ├─ Highly specific patterns
  ├─ Parent genre validation
  ├─ Specialized tropes
  └─ Niche audience signals

Cross-tags (LOWER COMPLEXITY)
  ├─ Direct phrase matching
  ├─ Synonym detection
  ├─ Contextual phrases
  └─ False positive avoidance
```

## File Structure

```
taxonomy_patterns/
├── domain_patterns.json           (4 patterns)
├── supergenre_patterns.json       (34 patterns)
├── genre_patterns.json             (101 patterns)
├── subgenre_patterns.json          (500 patterns - to be done in phases)
└── cross_tag_patterns_v1.json      (640 patterns - completed)
```

## Pattern Schema

### Domain Patterns (Most Sophisticated)

```json
{
  "fiction": {
    "name": "Fiction",
    "description": "Imaginative narratives with invented characters, plots, and settings",
    
    "required_indicators": {
      "narrative_structure": [
        "character development",
        "plot progression",
        "story arc",
        "fictional events"
      ],
      "content_markers": [
        "protagonist",
        "antagonist",
        "conflict",
        "resolution",
        "narrative voice"
      ]
    },
    
    "strong_signals": [
      "novel", "story", "tale", "narrative",
      "protagonist", "character", "plot",
      "fictional", "imagined", "invented"
    ],
    
    "structural_patterns": [
      "tells the story of",
      "follows [character]",
      "when [character] discovers",
      "must [action] to [goal]",
      "journey to [destination]"
    ],
    
    "format_indicators": {
      "positive": ["novel", "novella", "short story", "epic", "saga"],
      "negative": ["textbook", "manual", "guide", "encyclopedia", "reference"]
    },
    
    "exclusion_rules": {
      "autobiography": "contains factual life events",
      "biography": "about real person's life",
      "memoir": "personal recollection of real events",
      "history": "documented past events",
      "scientific": "empirical research and data",
      "instructional": "how-to or educational content"
    },
    
    "confidence_weights": {
      "narrative_structure": 0.30,
      "content_markers": 0.25,
      "strong_signals": 0.20,
      "structural_patterns": 0.15,
      "format_indicators": 0.10
    },
    
    "minimum_confidence": 0.75,
    
    "validation_checks": [
      "Must NOT contain non-fiction indicators above threshold",
      "Must have at least 2 narrative structure matches",
      "Must have at least 3 content marker matches",
      "Should have fictional character names or invented settings"
    ]
  }
}
```

### Supergenre Patterns (High Sophistication)

```json
{
  "speculative-fiction": {
    "name": "Speculative Fiction",
    "description": "Fiction exploring imaginative scenarios beyond realistic norms",
    "parent_domain": "fiction",
    
    "genre_family": [
      "fantasy", "science-fiction", "dystopian-fiction",
      "paranormal", "supernatural-fiction", "urban-fantasy"
    ],
    
    "core_themes": [
      "alternative realities",
      "imagined worlds",
      "supernatural elements",
      "advanced technology",
      "magic systems",
      "future societies"
    ],
    
    "strong_indicators": [
      "magic", "magical", "wizard", "sorcery",
      "science fiction", "sci-fi", "futuristic",
      "paranormal", "supernatural", "fantasy",
      "dystopia", "post-apocalyptic", "alternate reality"
    ],
    
    "world_building_signals": [
      "imagined world",
      "fictional universe",
      "alternate dimension",
      "magical realm",
      "future Earth",
      "distant planet"
    ],
    
    "exclusion_rules": {
      "contemporary_realism": "set in current real world",
      "historical_without_fantasy": "purely historical setting",
      "pure_romance": "romance without speculative elements"
    },
    
    "confidence_boost_if": {
      "multiple_genre_matches": 0.15,
      "strong_world_building": 0.10,
      "speculative_premise": 0.10
    },
    
    "minimum_confidence": 0.70
  }
}
```

### Genre Patterns (Medium-High Sophistication)

```json
{
  "fantasy": {
    "name": "Fantasy",
    "description": "Fiction featuring magic, mythical creatures, and invented worlds",
    "parent_supergenre": "speculative-fiction",
    "parent_domain": "fiction",
    
    "core_elements": {
      "magic_system": [
        "magic", "sorcery", "wizardry", "enchantment",
        "spells", "magical powers", "incantations"
      ],
      "fantastical_creatures": [
        "dragons", "elves", "dwarves", "fairies", "fae",
        "unicorns", "griffins", "mythical beasts"
      ],
      "settings": [
        "magical realm", "fantasy world", "enchanted kingdom",
        "mystical land", "fictional realm"
      ]
    },
    
    "typical_tropes": [
      "chosen-one", "prophecy", "quest", "magic-school",
      "sword-and-sorcery", "dark-lord", "ancient-magic"
    ],
    
    "plot_patterns": [
      "quest for [artifact/goal]",
      "battle against [dark force]",
      "discovers magical abilities",
      "journey through [fantasy realm]",
      "prophecy foretold"
    ],
    
    "character_archetypes": [
      "wizard", "sorcerer", "mage", "knight",
      "elven warrior", "dragon rider", "chosen one"
    ],
    
    "subgenres": [
      "epic-fantasy", "urban-fantasy", "dark-fantasy",
      "high-fantasy", "low-fantasy", "sword-and-sorcery"
    ],
    
    "strong_signals": ["fantasy", "magical", "enchanted", "mystical"],
    
    "avoid_confusion_with": {
      "science-fiction": "technology-based, not magic-based",
      "paranormal-romance": "romance-primary with fantasy elements",
      "horror": "fear-primary vs wonder-primary"
    },
    
    "minimum_confidence": 0.65
  }
}
```

### Subgenre Patterns (Medium Sophistication)

```json
{
  "epic-fantasy": {
    "name": "Epic Fantasy",
    "description": "Large-scale fantasy with world-spanning conflicts and extensive world-building",
    "parent_genre": "fantasy",
    "parent_supergenre": "speculative-fiction",
    
    "defining_characteristics": [
      "large cast of characters",
      "multiple storylines",
      "world-spanning conflict",
      "detailed world-building",
      "high stakes (fate of world/realm)"
    ],
    
    "exact_phrases": [
      "epic fantasy",
      "epic tale",
      "world-spanning"
    ],
    
    "scale_indicators": [
      "kingdoms", "empires", "realms", "continents",
      "armies", "wars", "battles", "sieges",
      "fate of the world", "ultimate evil"
    ],
    
    "structure_signals": [
      "multi-book series",
      "extensive cast",
      "multiple POV",
      "complex magic system"
    ],
    
    "typical_elements": [
      "chosen-one", "prophecy", "ancient-evil",
      "quest", "fellowship", "dark-lord"
    ],
    
    "minimum_confidence": 0.60,
    
    "validation": {
      "must_have_parent_genre": "fantasy",
      "scale_requirements": "at least 2 scale indicators",
      "avoid_if": ["small-scale personal story", "single location", "short story"]
    }
  }
}
```

## Matching Algorithm

### Phase 1: Domain Detection (Required First)
1. Load domain_patterns.json
2. Score each domain against book summary
3. Select highest-confidence domain (must exceed 0.75 threshold)
4. Domain determines which supergenres/genres are valid

### Phase 2: Supergenre Detection
1. Load supergenre_patterns.json
2. Filter to supergenres matching detected domain
3. Score each against summary
4. Select 1-2 highest-confidence supergenres (threshold: 0.70)

### Phase 3: Genre Detection
1. Load genre_patterns.json
2. Filter to genres matching detected supergenres
3. Score each against summary
4. Select 1-3 highest-confidence genres (threshold: 0.65)

### Phase 4: Subgenre Detection
1. Load subgenre_patterns.json (or relevant subset)
2. Filter to subgenres matching detected genres
3. Score each against summary
4. Select 1-5 highest-confidence subgenres (threshold: 0.60)

### Phase 5: Cross-Tag Detection
1. Load cross_tag_patterns_v1.json
2. Apply all patterns (no filtering)
3. Score and rank all matches
4. Select 10-20 highest-confidence cross-tags (threshold: 0.50)

## Scoring Formula

### Domain/Supergenre/Genre (Weighted Multi-Factor)

```javascript
function calculateTaxonomyScore(pattern, summary) {
  let score = 0;
  
  // Required indicators (must have minimum matches)
  const requiredMatches = countMatches(pattern.required_indicators, summary);
  if (requiredMatches < pattern.minimum_required) return 0;
  score += requiredMatches * pattern.confidence_weights.required;
  
  // Strong signals
  const strongMatches = countMatches(pattern.strong_signals, summary);
  score += strongMatches * pattern.confidence_weights.strong_signals;
  
  // Structural patterns
  const structuralMatches = countMatches(pattern.structural_patterns, summary);
  score += structuralMatches * pattern.confidence_weights.structural;
  
  // Format indicators
  const formatMatches = countMatches(pattern.format_indicators.positive, summary);
  const formatExclusions = countMatches(pattern.format_indicators.negative, summary);
  score += (formatMatches - formatExclusions) * pattern.confidence_weights.format;
  
  // Apply exclusion rules
  for (const [rule, description] of Object.entries(pattern.exclusion_rules)) {
    if (matchesExclusion(rule, summary)) {
      score *= 0.3; // Heavy penalty
    }
  }
  
  // Apply validation checks
  for (const check of pattern.validation_checks) {
    if (!passesValidation(check, summary)) {
      score *= 0.7; // Moderate penalty
    }
  }
  
  return Math.min(score, 1.0);
}
```

### Cross-Tag (Simple Pattern Matching)

```javascript
function calculateCrossTagScore(pattern, summary) {
  let score = 0.5; // Base confidence
  
  // Exact phrase match
  if (matchesAny(pattern.exact, summary)) {
    score = 0.85 + pattern.confidence_boost;
  }
  // Synonym match
  else if (matchesAny(pattern.synonyms, summary)) {
    score = 0.75 + pattern.confidence_boost;
  }
  // Contextual phrase match
  else if (matchesAny(pattern.phrases, summary)) {
    score = 0.65 + pattern.confidence_boost;
  }
  else {
    return 0; // No match
  }
  
  // Apply avoid patterns (false positive check)
  if (matchesAny(pattern.avoid, summary)) {
    return 0; // Disqualify
  }
  
  return score;
}
```

## Implementation Priority

### Immediate (Current Session)
1. ✅ Merge cross-tag pattern batches
2. ✅ Create architecture document
3. ⏳ Create domain_patterns.json (4 patterns)
4. ⏳ Create supergenre_patterns.json (34 patterns - do top 20 first)
5. ⏳ Create genre_patterns.json (101 patterns - do top 30 first)

### Near-term (Next Session)
6. Complete remaining supergenre patterns (14 more)
7. Complete remaining genre patterns (71 more)
8. Start subgenre_patterns.json (top 100 most common)

### Long-term (Multiple Sessions)
9. Complete all 500 subgenre patterns
10. Expand cross-tag patterns from 640 to 1,000+
11. Build pattern validation test suite
12. Create pattern improvement feedback loop

## 🔗 Integration with Evidence Packs

- **Input sources:** Run pattern matching against both AI summaries *and* harvested evidence snapshots (`source_snapshots.extract`). Snapshots provide CC0/CC-BY-SA text identical to what downstream LLMs consume, keeping confidence scores aligned.
- **Execution order:**
  1. Harvest evidence (OpenLibrary, Wikipedia, future Wikidata/LCSH).
  2. Execute the deterministic pattern engine using the weighting rules in this document.
  3. Invoke LLM fallbacks only when patterns leave tags unresolved or under the confidence threshold, and insist that every AI suggestion cites the supporting snapshot ID.
- **Provenance writing:** When a pattern fires, record the snapshot ID(s) that contained the match so `book_cross_tags.source_ids` captures deterministic as well as AI-derived evidence.
- **Conflict handling:** If harvested evidence contradicts a high-weight pattern (e.g., repeated non-fiction indicators vs. a fiction pattern), keep the higher-confidence result but flag it for the validator defined in `GPT_METADATA_ENRICHMENT_GUIDE.md`.

## Quality Standards

### Pattern Completeness Requirements

**Domain**: 100% (4/4) - REQUIRED
**Supergenre**: 100% (34/34) - HIGH PRIORITY
**Genre**: 100% (101/101) - HIGH PRIORITY
**Subgenre**: 60% (300/500) - MEDIUM PRIORITY (focus on popular genres)
**Cross-tags**: 40% (1,000/2,733) - ONGOING (diminishing returns after 1,000)

### Pattern Quality Metrics

- **Precision**: >85% for domains/supergenres/genres, >75% for subgenres/cross-tags
- **Recall**: >75% for all levels
- **False Positive Rate**: <10% for all levels
- **Confidence Calibration**: Scores should correlate with actual accuracy

### Testing Strategy

1. **Hold-out validation set**: 100 manually-tagged books
2. **Measure accuracy** at each taxonomy level
3. **Identify false positives/negatives**
4. **Iteratively refine patterns**
5. **Document edge cases** and ambiguous books

## Future Enhancements

1. **Machine learning integration**: Use patterns as features for ML model
2. **Semantic embeddings**: Layer 3 matching for edge cases
3. **Crowdsourced refinement**: User feedback on tag accuracy
4. **Dynamic pattern learning**: Auto-generate patterns from validated data
5. **Multi-language support**: Patterns for non-English books

---

**Version**: 1.0  
**Created**: 2025-01-24  
**Last Updated**: 2025-01-24  
**Status**: Architecture defined, implementation in progress
