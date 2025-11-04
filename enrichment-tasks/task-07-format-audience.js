// Task 7: Detect Format + Audience
// Usage: node task-07-format-audience.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const FORMAT_PATTERNS_FILE = 'format_patterns.json';

// Load format patterns
function loadFormatPatterns() {
  try {
    const data = JSON.parse(fs.readFileSync(FORMAT_PATTERNS_FILE, 'utf8'));
    return data.patterns || {};
  } catch (error) {
    console.warn(`    ⚠️  Could not load format patterns: ${error.message}`);
    return {};
  }
}

// Score a format pattern against book metadata
function scoreFormatPattern(pattern, book, enrichmentData) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  let description = (book.description || '').toLowerCase();
  
  // Use enriched summary if original description is null/empty
  if (!description && enrichmentData?.summary?.new_summary) {
    description = enrichmentData.summary.new_summary.toLowerCase();
  }
  
  const title = book.title.toLowerCase();
  const publisher = (book.publisher || '').toLowerCase();
  
  let score = 0;
  const weights = pattern.weights || {};
  
  // Exact phrase matching (highest weight)
  if (pattern.exact_phrases) {
    for (const phrase of pattern.exact_phrases) {
      const lowerPhrase = phrase.toLowerCase();
      if (title.includes(lowerPhrase) || description.includes(lowerPhrase)) {
        score += (weights.exact_phrase || 0.40);
        break; // Only count once
      }
    }
  }
  
  // Publisher/platform markers (high weight for web formats)
  if (pattern.publisher_markers || pattern.platform_indicators) {
    const markers = [
      ...(pattern.publisher_markers || []),
      ...(pattern.platform_indicators || [])
    ];
    for (const marker of markers) {
      const lowerMarker = marker.toLowerCase();
      if (publisher.includes(lowerMarker) || 
          title.includes(lowerMarker) || 
          description.includes(lowerMarker)) {
        score += (weights.publisher || weights.platform || 0.25);
        break;
      }
    }
  }
  
  // Title pattern matching (regex)
  if (pattern.title_patterns) {
    for (const patternRegex of pattern.title_patterns) {
      try {
        const regex = new RegExp(patternRegex, 'i');
        if (regex.test(title)) {
          score += (weights.title_pattern || 0.15);
          break;
        }
      } catch (e) {
        // Invalid regex, skip
      }
    }
  }
  
  // Category indicators
  if (pattern.category_indicators) {
    for (const indicator of pattern.category_indicators) {
      if (categories.some(c => c.includes(indicator.toLowerCase()))) {
        score += (weights.category || 0.20);
        break;
      }
    }
  }
  
  // Description markers
  if (pattern.description_markers) {
    let foundMarkers = 0;
    for (const marker of pattern.description_markers) {
      if (description.includes(marker.toLowerCase())) {
        foundMarkers++;
      }
    }
    if (foundMarkers > 0) {
      // Weight decreases as we find more matches (diminishing returns)
      const descriptionWeight = weights.description || 0.15;
      score += Math.min(foundMarkers * (descriptionWeight / 3), descriptionWeight);
    }
  }
  
  // Strong signals (boost score if found)
  if (pattern.strong_signals) {
    for (const signal of pattern.strong_signals) {
      if (title.includes(signal.toLowerCase()) || 
          description.includes(signal.toLowerCase())) {
        score += 0.10; // Small boost
        break;
      }
    }
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

// Detect format using format_patterns.json with weighted scoring
function detectFormat(book, enrichmentData = null) {
  const patterns = loadFormatPatterns();
  
  if (Object.keys(patterns).length === 0) {
    // Fallback to simple detection if patterns not available
    return detectFormatSimple(book, enrichmentData);
  }
  
  const categories = (book.categories || []).map(c => c.toLowerCase());
  let description = (book.description || '').toLowerCase();
  
  if (!description && enrichmentData?.summary?.new_summary) {
    description = enrichmentData.summary.new_summary.toLowerCase();
  }
  
  const title = book.title.toLowerCase();
  
  let bestFormat = null;
  let bestScore = 0;
  
  // Score all formats
  for (const [formatSlug, pattern] of Object.entries(patterns)) {
    const score = scoreFormatPattern(pattern, book, enrichmentData);
    const minConfidence = pattern.minimum_confidence || 0.60;
    
    if (score >= minConfidence && score > bestScore) {
      bestFormat = {
        slug: formatSlug,
        pattern: pattern,
        score: score
      };
      bestScore = score;
    }
  }
  
  if (bestFormat) {
    // Convert score to confidence level
    let confidence = 'medium';
    if (bestScore >= 0.75) {
      confidence = 'high';
    } else if (bestScore < 0.65) {
      confidence = 'low';
    }
    
    return {
      slug: bestFormat.slug,
      confidence: confidence,
      score: bestScore,
      reason: `Pattern-based detection: ${bestFormat.pattern.name} (score: ${bestScore.toFixed(2)}, threshold: ${bestFormat.pattern.minimum_confidence})`
    };
  }
  
  // Fallback to simple detection if no pattern matched
  return detectFormatSimple(book, enrichmentData);
}

// Simple format detection (fallback)
function detectFormatSimple(book, enrichmentData = null) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  let description = (book.description || '').toLowerCase();
  
  if (!description && enrichmentData?.summary?.new_summary) {
    description = enrichmentData.summary.new_summary.toLowerCase();
  }
  
  const title = book.title.toLowerCase();
  
  // Check for anthology/collection indicators
  const anthologyKeywords = [
    'anthology', 'collection', 'short fiction', 'short stories', 
    'collected works', 'complete fiction', 'award-winning fiction',
    'stories by', 'tales from', 'collected stories'
  ];
  
  const hasAnthologyIndicator = anthologyKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
  
  if (hasAnthologyIndicator) {
    return {
      slug: 'anthology',
      confidence: 'high',
      reason: 'Title or description indicates anthology/collection format'
    };
  }
  
  // Check for audiobook indicators
  if (categories.some(c => c.includes('audio') || c.includes('audiobook')) ||
      title.includes('audiobook') || title.includes('[audio')) {
    return {
      slug: 'audiobook',
      confidence: 'high',
      reason: 'Category or title indicates audiobook format'
    };
  }
  
  // Check for ebook indicators
  if (categories.some(c => c.includes('ebook') || c.includes('electronic') || c.includes('kindle')) ||
      title.includes('kindle') || title.includes('[ebook')) {
    return {
      slug: 'ebook',
      confidence: 'medium',
      reason: 'Category or title indicates ebook format'
    };
  }
  
  // Check description for format clues
  if (description.includes('audiobook') || description.includes('audio edition')) {
    return {
      slug: 'audiobook',
      confidence: 'medium',
      reason: 'Description mentions audiobook'
    };
  }
  
  if (description.includes('paperback') || description.includes('trade paperback')) {
    return {
      slug: 'paperback',
      confidence: 'low',
      reason: 'Description mentions paperback'
    };
  }
  
  if (description.includes('hardcover') || description.includes('hardback')) {
    return {
      slug: 'hardcover',
      confidence: 'low',
      reason: 'Description mentions hardcover'
    };
  }
  
  // Unable to determine - leave null
  return {
    slug: null,
    confidence: 'unknown',
    reason: 'Format cannot be determined from available metadata'
  };
}

// Detect audience (adult, young-adult, middle-grade, children)
function detectAudience(book) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const description = (book.description || '').toLowerCase();
  const title = book.title.toLowerCase();
  
  // Check for explicit age market indicators
  if (categories.some(c => c.includes('juvenile') || c.includes('children'))) {
    if (categories.some(c => c.includes('young adult') || c.includes('ya'))) {
      return {
        slug: 'young-adult',
        confidence: 'high',
        reason: 'Category indicates Young Adult'
      };
    }
    return {
      slug: 'children',
      confidence: 'medium',
      reason: 'Category indicates Juvenile/Children'
    };
  }
  
  // Check description for age indicators
  if (description.includes('young adult') || description.includes('teen')) {
    return {
      slug: 'young-adult',
      confidence: 'medium',
      reason: 'Description mentions young adult/teen themes'
    };
  }
  
  if (description.includes('middle grade') || description.includes('ages 8-12')) {
    return {
      slug: 'middle-grade',
      confidence: 'medium',
      reason: 'Description mentions middle grade'
    };
  }
  
  // Check for academic/adult indicators
  if (description.includes('academic') || description.includes('researchers') ||
      description.includes('scholars') || description.includes('postgraduate')) {
    return {
      slug: 'adult',
      confidence: 'high',
      reason: 'Academic audience indicated'
    };
  }
  
  // Default to adult (general audience) for most books
  return {
    slug: 'adult',
    confidence: 'medium',
    reason: 'General adult audience (default for fiction/non-fiction without age qualifiers)'
  };
}

async function detectFormatAudience(bookId) {
  console.log(`👥 Task 7: Detecting format + audience for book ${bookId}...`);
  
  const booksData = JSON.parse(fs.readFileSync('books_batch_001.json', 'utf8'));
  const book = booksData.find(b => b.id === bookId);
  
  if (!book) {
    throw new Error(`Book ${bookId} not found in batch`);
  }
  
  console.log(`  Title: ${book.title}`);
  
  // Load existing enrichment data (may have summary)
  const outputPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let enrichmentData = null;
  if (fs.existsSync(outputPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }
  
  const format = detectFormat(book, enrichmentData);
  const audience = detectAudience(book);
  
  const result = {
    format: format,
    audience: audience,
    notes: []
  };
  
  if (format.slug) {
    const scoreInfo = format.score ? ` (score: ${format.score.toFixed(2)})` : '';
    console.log(`  ✅ Format: ${format.slug}${scoreInfo} (${format.confidence})`);
  } else {
    console.log(`  ⚠️  Format: Unknown - ${format.reason}`);
    result.notes.push('Format could not be determined - leave NULL or manually review');
  }
  
  console.log(`  ✅ Audience: ${audience.slug} (${audience.confidence})`);
  if (audience.confidence === 'low') {
    result.notes.push('Audience detection has low confidence - may need manual review');
  }
  
  // Save result (reuse loaded enrichmentData or create new)
  if (!enrichmentData) {
    enrichmentData = {};
  }
  enrichmentData.format = result.format;
  enrichmentData.audience = result.audience;
  enrichmentData.last_updated = new Date().toISOString();
  
  fs.writeFileSync(outputPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${outputPath}`);
  
  return result;
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-07-format-audience.js <book_id>');
  process.exit(1);
}

detectFormatAudience(bookId).catch(console.error);
