/**
 * Cover Selection Utilities
 * 
 * Functions for determining which cover to display:
 * - Series standardization (all books in series use same edition style)
 * - Default cover selection
 */

export interface Edition {
  id: string;
  coverUrl: string | null;
  format: string;
  publicationDate: string | null;
  editionStatement: string | null;
  googleBooksId: string | null;
  isbn13: string | null;
}

export interface Work {
  id: string;
  series: string | null;
  seriesOrder: number | null;
  displayEditionId: string | null;
}

/**
 * Determine the default cover for a book based on series standardization
 * 
 * Strategy:
 * 1. If book is part of a series, use the same edition style across all books
 * 2. Prefer Google Books clean covers (no edge=curl parameters)
 * 3. Prefer hardcover > paperback > ebook formats
 * 4. Use most recent publication date as tiebreaker
 */
export function getDefaultCoverForSeries(
  editions: Edition[],
  series: string | null,
  allSeriesEditions: Map<string, Edition[]> // series -> editions for all books in series
): Edition | null {
  if (!editions.length) return null;
  
  // If not part of a series, use best quality edition
  if (!series) {
    return getBestQualityEdition(editions);
  }
  
  // For series: standardize on the same edition style
  // Find the most common format/edition style across the series
  const seriesEditions = allSeriesEditions.get(series) || [];
  
  if (seriesEditions.length === 0) {
    // First book in series - use best quality
    return getBestQualityEdition(editions);
  }
  
  // Find most common format in series
  const formatCounts = new Map<string, number>();
  seriesEditions.forEach(ed => {
    if (ed.format) {
      formatCounts.set(ed.format, (formatCounts.get(ed.format) || 0) + 1);
    }
  });
  
  const mostCommonFormat = Array.from(formatCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  // Prefer editions matching the most common format
  const matchingFormat = editions.filter(e => e.format === mostCommonFormat);
  if (matchingFormat.length > 0) {
    return getBestQualityEdition(matchingFormat);
  }
  
  // Fallback to best quality
  return getBestQualityEdition(editions);
}

/**
 * Get the best quality edition from a list
 * Prioritizes:
 * 1. Google Books clean covers (no scan indicators)
 * 2. Hardcover > Paperback > Ebook
 * 3. Most recent publication date
 */
function getBestQualityEdition(editions: Edition[]): Edition | null {
  if (editions.length === 0) return null;
  if (editions.length === 1) return editions[0];
  
  // Score each edition
  const scored = editions.map(ed => ({
    edition: ed,
    score: scoreEditionQuality(ed),
  }));
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].edition;
}

function scoreEditionQuality(edition: Edition): number {
  let score = 0;
  
  // Must have cover
  if (!edition.coverUrl) return -1000;
  
  // Google Books clean covers are highest quality
  if (edition.googleBooksId && edition.coverUrl.includes('books.google.com')) {
    const isLowQuality = edition.coverUrl.includes('edge=curl') || 
                        edition.coverUrl.includes('edge=shadow');
    if (!isLowQuality) {
      score += 1000; // Clean Google Books cover
    } else {
      score += 200; // Scanned Google Books cover
    }
  }
  
  // Format preference
  const formatScores: Record<string, number> = {
    'hardcover': 100,
    'paperback': 80,
    'ebook': 60,
    'audiobook': 40,
    'unknown': 0,
  };
  score += formatScores[edition.format] || 50;
  
  // Recent publication date (prefer newer)
  if (edition.publicationDate) {
    const date = new Date(edition.publicationDate);
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - year;
    score += Math.max(0, 50 - yearsAgo); // Prefer recent, but not too much
  }
  
  return score;
}

/**
 * Check if a cover URL is low quality (scanned/photographed)
 */
export function isLowQualityCover(coverUrl: string | null): boolean {
  if (!coverUrl) return true;
  const lowerUrl = coverUrl.toLowerCase();
  return lowerUrl.includes('edge=curl') || 
         lowerUrl.includes('edge=shadow') ||
         lowerUrl.includes('edge=thumb');
}

