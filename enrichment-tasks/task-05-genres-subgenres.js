// Task 5: Assign Genres + Subgenres
// Usage: node task-05-genres-subgenres.js <book_id>
// Output: Appends to enrichment_data/<book_id>.json

import fs from 'fs';
import path from 'path';

const ENRICHMENT_DIR = 'enrichment_data';
const taxonomy = JSON.parse(fs.readFileSync('bookshelves_complete_taxonomy.json', 'utf8'));
const subgenrePatterns = JSON.parse(fs.readFileSync('subgenre_patterns.json', 'utf8')).patterns;

// Helper to find genre by slug
function findGenre(slug) {
  return taxonomy.genres.find(g => g.slug === slug);
}

// Helper to find subgenres for a genre
function findSubgenres(genreSlug) {
  return taxonomy.subgenres.filter(sg => sg.genre_slug === genreSlug);
}

// Suggest genres based on categories with domain validation
function suggestGenres(book, domain) {
  const categories = (book.categories || []).map(c => c.toLowerCase());
  const title = book.title.toLowerCase();
  const genreSlugs = [];
  
  // CRITICAL: Literary Criticism is a NON-FICTION field, not a fiction genre
  // Don't map it to 'literary-fiction' which is a fiction genre
  if (categories.some(cat => cat.includes('literary criticism') || cat.includes('criticism'))) {
    // This is academic analysis - check domain
    if (domain === 'nonfiction') {
      // Could be literary-criticism, cultural-studies, etc.
      // For now, leave empty and require manual assignment
      return [];
    }
  }
  
  // CRITICAL: Google Books often adds spurious "Fantasy" category based on title words
  // Only trust "Fantasy" if there's supporting evidence
  if (categories.includes('fantasy') && domain === 'nonfiction') {
    // Remove fantasy from categories - it's likely a false positive
    console.log(`    ⚠️  Ignoring spurious 'Fantasy' category for non-fiction book (likely from title)`);
    const filteredCategories = categories.filter(c => c !== 'fantasy');
    if (filteredCategories.length === 0) {
      return [];
    }
    // Continue with filtered categories
    categories.length = 0;
    categories.push(...filteredCategories);
  }
  
  // Filter out fiction genres if domain is non-fiction
  const fictionGenres = ['fantasy', 'science-fiction', 'mystery', 'thriller', 'romance', 'horror', 'literary-fiction'];
  const nonfictionGenres = ['history', 'biography', 'memoir', 'autobiography', 'business', 'economics', 'psychology', 'philosophy'];
  
  // Direct mappings from API categories to taxonomy genres
  const genreMap = {
    'science fiction': 'science-fiction',
    'fantasy': 'fantasy',
    'mystery': 'mystery',
    'thriller': 'thriller',
    'romance': 'romance',
    'horror': 'horror',
    'history': 'history',
    'biography': 'biography',
    'autobiography': 'autobiography',
    'business': 'business',
    'economics': 'economics',
    'juvenile nonfiction': 'reference',
    'social science': 'sociology',
    'political science': 'political-science'
  };
  
  categories.forEach(cat => {
    Object.keys(genreMap).forEach(key => {
      if (cat.includes(key)) {
        const slug = genreMap[key];
        
        // VALIDATION: Check if genre matches domain
        const isFictionGenre = fictionGenres.includes(slug);
        const isNonfictionGenre = nonfictionGenres.includes(slug);
        
        if (domain === 'fiction' && isNonfictionGenre) {
          // Skip non-fiction genres for fiction books
          console.log(`    ⚠️  Skipping non-fiction genre '${slug}' for fiction book`);
          return;
        }
        
        if (domain === 'nonfiction' && isFictionGenre) {
          // Skip fiction genres for non-fiction books
          console.log(`    ⚠️  Skipping fiction genre '${slug}' for non-fiction book (likely from title keyword)`);
          return;
        }
        
        if (!genreSlugs.includes(slug) && findGenre(slug)) {
          genreSlugs.push(slug);
        }
      }
    });
  });
  
  return genreSlugs.slice(0, 3); // Max 3 genres
}

// Score a subgenre pattern against book metadata
function scoreSubgenrePattern(pattern, book, description, title) {
  let score = 0;
  const categories = (book.categories || []).map(c => c.toLowerCase()).join(' ');
  const text = `${title} ${description} ${categories}`;
  
  // Check exact phrases (highest weight) - also check categories
  if (pattern.exact_phrases) {
    for (const phrase of pattern.exact_phrases) {
      const phrasePattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (phrasePattern.test(title)) {
        score += 0.45;
        break;
      } else if (phrasePattern.test(description)) {
        score += 0.40;
        break;
      } else if (phrasePattern.test(categories)) {
        score += 0.50; // Categories are very strong signal (user/publisher assigned)
        break;
      }
    }
  }
  
  // Check strong signals - also check categories
  if (pattern.strong_signals) {
    for (const signal of pattern.strong_signals) {
      const signalPattern = new RegExp(`\\b${signal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (signalPattern.test(title)) {
        score += 0.20;
        break;
      } else if (signalPattern.test(description)) {
        score += 0.15;
        break;
      } else if (signalPattern.test(categories)) {
        score += 0.20; // Categories are strong signal
        break;
      }
    }
  }
  
    // Check semantic indicators (scale_markers, setting_markers, tone_markers, etc.)                                                                             
  const indicatorFields = [
    'scale_markers', 'scale_indicators', 'setting_markers', 'tone_markers', 'action_markers',    
    'world_markers', 'time_markers', 'creature_markers', 'tech_markers',        
    'science_markers', 'progression_markers', 'cultivation_markers'
  ];

  for (const field of indicatorFields) {
    if (pattern[field] && Array.isArray(pattern[field])) {
      let foundCount = 0;
      for (const marker of pattern[field]) {
        const markerPattern = new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');                                                        
        if (markerPattern.test(description) || markerPattern.test(title) || markerPattern.test(categories)) {
          foundCount++;
        }
      }
      if (foundCount > 0) {
        // Weight increases with more matches (multiple indicators = stronger signal)                                                                           
        score += Math.min(foundCount * 0.10, 0.30); // Increased max from 0.25 to 0.30
      }
    }
  }

  // Special case: space-opera detection (improve sensitivity)
  if (pattern.slug === 'space-opera' || pattern.name?.toLowerCase().includes('space opera')) {
    // Check for "space opera" phrase variations
    const spaceOperaPhrases = [
      /\bspace opera\b/i,
      /\bgalactic (?:empire|scale|war|adventure)\b/i,
      /\bepic space\b/i,
      /\binterstellar\b/i,
      /\bstar-spanning\b/i
    ];
    for (const phrase of spaceOperaPhrases) {
      if (phrase.test(description) || phrase.test(title) || phrase.test(categories)) {
        score += 0.25; // Boost score for space opera indicators
        break;
      }
    }
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

// Suggest subgenres based on title, description and genres using pattern-based detection
function suggestSubgenres(book, genreSlugs, enrichmentData = null) {
  let description = (book.description || '').toLowerCase();
  
  // Use enriched summary if original description is null/empty
  if (!description && enrichmentData?.summary?.new_summary) {
    description = enrichmentData.summary.new_summary.toLowerCase();
    console.log(`    ℹ️  Using enriched summary for subgenre detection (no original description)`);
  }
  
  const title = book.title.toLowerCase();
  const subgenres = [];
  const scoredSubgenres = [];
  
  // For each assigned genre, look for relevant subgenres
  genreSlugs.forEach(genreSlug => {
    const availableSubgenres = findSubgenres(genreSlug);
    
    availableSubgenres.forEach(sg => {
      // Method 1: Pattern-based detection (if pattern exists)
      const pattern = subgenrePatterns[sg.slug];
      if (pattern && pattern.parent_genre === genreSlug) {
        const score = scoreSubgenrePattern(pattern, book, description, title);
        const minConfidence = pattern.minimum_confidence || 0.60;
        
        if (score >= minConfidence) {
          scoredSubgenres.push({
            slug: sg.slug,
            name: sg.name,
            genre_slug: sg.genre_slug,
            score: score,
            method: 'pattern-match'
          });
        }
      }
      
      // Method 2: Literal matching (fallback if no pattern or pattern didn't match)
      const subgenreName = sg.name.toLowerCase();
      const subgenreSlug = sg.slug.toLowerCase();
      
      const namePattern = new RegExp(`\\b${subgenreName.replace(/[\s-]+/g, '[\\s-]')}\\b`, 'i');
      const slugPattern = new RegExp(`\\b${subgenreSlug.replace(/-/g, '[\\s-]')}\\b`, 'i');
      
      let matched = false;
      if (namePattern.test(title) || slugPattern.test(title)) {
        matched = true;
      } else if (namePattern.test(description) || slugPattern.test(description)) {
        matched = true;
      }
      
      if (matched) {
        // Only add if not already added by pattern matching
        const existing = scoredSubgenres.find(s => s.slug === sg.slug);
        if (!existing) {
          scoredSubgenres.push({
            slug: sg.slug,
            name: sg.name,
            genre_slug: sg.genre_slug,
            score: 0.5, // Lower score for literal match
            method: 'literal-match'
          });
        }
      }
    });
  });
  
  // Sort by score (pattern matches first, then literal matches)
  scoredSubgenres.sort((a, b) => b.score - a.score);
  
  // Convert to final format
  scoredSubgenres.forEach(item => {
    if (!subgenres.find(s => s.slug === item.slug)) {
      subgenres.push({
        slug: item.slug,
        name: item.name,
        genre_slug: item.genre_slug
      });
    }
  });
  
  return subgenres.slice(0, 5); // Max 5 subgenres
}

async function assignGenresSubgenres(bookId) {
  console.log(`📚 Task 5: Assigning genres + subgenres for book ${bookId}...`);
  
  // Load book from appropriate batch file
  const { loadBookFromBatch } = await import('./helpers.js');
  const book = loadBookFromBatch(bookId);
  
  console.log(`  Title: ${book.title}`);
  console.log(`  Categories: ${JSON.stringify(book.categories)}`);
  
  // Load domain and enrichment data from previous tasks
  const domainPath = path.join(ENRICHMENT_DIR, `${bookId}.json`);
  let domain = 'fiction'; // default
  let enrichmentData = null;
  if (fs.existsSync(domainPath)) {
    enrichmentData = JSON.parse(fs.readFileSync(domainPath, 'utf8'));
    domain = enrichmentData.taxonomy?.domain?.slug || 'fiction';
  }
  console.log(`  Domain: ${domain}`);
  
  const genreSlugs = suggestGenres(book, domain);
  const subgenres = suggestSubgenres(book, genreSlugs, enrichmentData);
  
  const result = {
    genres: genreSlugs.map(slug => ({
      slug,
      name: findGenre(slug)?.name || slug,
      confidence: 'suggested'
    })),
    subgenres: subgenres.map(sg => ({
      slug: sg.slug,
      name: sg.name,
      genre_slug: sg.genre_slug,
      confidence: 'suggested'
    })),
    status: genreSlugs.length > 0 ? 'suggested' : 'needs_manual_review',
    notes: []
  };
  
  console.log(`  ✅ Genres (${result.genres.length}): ${genreSlugs.join(', ')}`);
  console.log(`  ✅ Subgenres (${result.subgenres.length}): ${subgenres.map(s => s.slug).join(', ')}`);
  
  if (genreSlugs.length === 0) {
    result.notes.push('WARNING: No genres automatically suggested');
    result.notes.push('MANUAL STEP: Assign 1-3 genres from taxonomy');
  }
  
  // Save result (reuse loaded enrichmentData or create new)
  if (!enrichmentData) {
    enrichmentData = {};
  }
  if (!enrichmentData.taxonomy) enrichmentData.taxonomy = {};
  enrichmentData.taxonomy.genres = result.genres;
  enrichmentData.taxonomy.subgenres = result.subgenres;
  enrichmentData.last_updated = new Date().toISOString();
  
  fs.writeFileSync(domainPath, JSON.stringify(enrichmentData, null, 2));
  
  console.log(`  💾 Saved to ${domainPath}`);
  
  return result;
}

const bookId = process.argv[2];
if (!bookId) {
  console.error('Usage: node task-05-genres-subgenres.js <book_id>');
  process.exit(1);
}

assignGenresSubgenres(bookId).catch(console.error);
