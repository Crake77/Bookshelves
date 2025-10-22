import { db } from "../../db/index";
import { works, editions, releaseEvents } from "@shared/schema";
import { eq, sql, and, desc, asc } from "drizzle-orm";

/**
 * Parse Google Books publishedDate string into a Date object
 * Handles formats: "2024", "2024-03", "2024-03-15", "circa 2020", null
 * Returns null if unparseable
 */
export function parsePublishedDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  
  // Trim and normalize
  const cleaned = raw.trim().toLowerCase()
    .replace(/^(circa|ca\.?\s+)/i, "") // Remove "circa" prefix
    .replace(/[^0-9-]/g, ""); // Remove non-numeric/dash chars
  
  if (!cleaned) return null;
  
  // Split by dash
  const parts = cleaned.split("-");
  const year = parseInt(parts[0], 10);
  
  // Validate year
  if (!year || year < 1000 || year > 3000) return null;
  
  // Default to January 1st if month/day missing
  const month = parts.length > 1 ? parseInt(parts[1], 10) : 1;
  const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
  
  // Validate month and day
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  try {
    // Use UTC to avoid timezone shifts
    return new Date(Date.UTC(year, month - 1, day));
  } catch {
    return null;
  }
}

/**
 * Normalize title for fuzzy matching
 * Removes articles, punctuation, diacritics, and normalizes whitespace
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Remove leading articles (English, French, Spanish, German)
    .replace(/^(the|a|an|le|la|les|un|une|el|los|las|der|die|das)\s+/i, "")
    // Remove punctuation except hyphens
    .replace(/[^\w\s-]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract series information from title
 * Detects patterns like "Book 1", "#2", "Part Three", etc.
 * Returns { title: normalized title, seriesNumber: number | null }
 */
export function extractSeriesInfo(title: string): { title: string; seriesNumber: number | null } {
  const patterns = [
    /\s+book\s+(\d+)/i,
    /\s+#(\d+)/,
    /\s+volume\s+(\d+)/i,
    /\s+vol\.?\s+(\d+)/i,
    /\s+part\s+(\d+)/i,
    /\s+\((\d+)\)/,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const number = parseInt(match[1], 10);
      const cleanTitle = title.replace(pattern, "").trim();
      return { title: cleanTitle, seriesNumber: number };
    }
  }
  
  return { title, seriesNumber: null };
}

/**
 * Detect event type from edition metadata
 * Returns { eventType, isMajor, promoStrength }
 */
export function detectEventType(editionStatement: string | null, categories: string[] | null): {
  eventType: string;
  isMajor: boolean;
  promoStrength: number;
} {
  const statement = (editionStatement || "").toLowerCase();
  const cats = (categories || []).join(" ").toLowerCase();
  
  // Movie/TV tie-in detection (highest priority)
  if (
    /\b(tie[-\s]?in|film|movie|tv|television|series|adaptation|netflix|hbo|amazon)\b/i.test(statement) ||
    /\b(film|movie|tv)\b/i.test(cats)
  ) {
    return {
      eventType: "MAJOR_REISSUE_PROMO",
      isMajor: true,
      promoStrength: 85,
    };
  }
  
  // Anniversary edition
  if (/\b(anniversary|10th|20th|25th|30th|40th|50th)\b/i.test(statement)) {
    return {
      eventType: "SPECIAL_EDITION",
      isMajor: true,
      promoStrength: 70,
    };
  }
  
  // Revised/expanded edition
  if (/\b(revised|expanded|updated|corrected|annotated|illustrated|unabridged)\b/i.test(statement)) {
    return {
      eventType: "REVISED_EXPANDED",
      isMajor: true,
      promoStrength: 60,
    };
  }
  
  // Special/collector's edition
  if (/\b(special|collector|deluxe|limited|signed|hardback|leather)\b/i.test(statement)) {
    return {
      eventType: "SPECIAL_EDITION",
      isMajor: false, // Unless high promo
      promoStrength: 40,
    };
  }
  
  // New cover/reprint (minor)
  if (/\b(new cover|reprint|re[-\s]?print)\b/i.test(statement)) {
    return {
      eventType: "MINOR_REPRINT",
      isMajor: false,
      promoStrength: 10,
    };
  }
  
  // Default to unknown (treat as minor)
  return {
    eventType: "MINOR_REPRINT",
    isMajor: false,
    promoStrength: 20,
  };
}

/**
 * Compute all date fields for a work based on its release events
 * Updates the work record in the database
 */
export async function updateWorkDates(workId: string): Promise<void> {
  const now = new Date();
  
  // Fetch all events for this work's editions
  const events = await db
    .select({
      eventDate: releaseEvents.eventDate,
      eventType: releaseEvents.eventType,
      isMajor: releaseEvents.isMajor,
    })
    .from(releaseEvents)
    .innerJoin(editions, eq(editions.id, releaseEvents.editionId))
    .where(eq(editions.workId, workId))
    .execute();
  
  if (events.length === 0) {
    // No events, clear computed dates
    await db
      .update(works)
      .set({
        originalPublicationDate: null,
        latestMajorReleaseDate: null,
        latestAnyReleaseDate: null,
        nextMajorReleaseDate: null,
        updatedAt: now,
      })
      .where(eq(works.id, workId))
      .execute();
    return;
  }
  
  const pastEvents = events.filter(e => e.eventDate && e.eventDate <= now);
  const futureEvents = events.filter(e => e.eventDate && e.eventDate > now);
  
  // Original publication date: earliest ORIGINAL_RELEASE
  const originalEvents = pastEvents.filter(e => e.eventType === "ORIGINAL_RELEASE");
  const originalDate = originalEvents.length > 0
    ? originalEvents.reduce((min, e) => (e.eventDate! < min ? e.eventDate! : min), originalEvents[0].eventDate!)
    : null;
  
  // Latest major release: most recent major event
  const majorEvents = pastEvents.filter(e => e.isMajor);
  const latestMajor = majorEvents.length > 0
    ? majorEvents.reduce((max, e) => (e.eventDate! > max ? e.eventDate! : max), majorEvents[0].eventDate!)
    : null;
  
  // Latest any release: most recent event
  const latestAny = pastEvents.length > 0
    ? pastEvents.reduce((max, e) => (e.eventDate! > max ? e.eventDate! : max), pastEvents[0].eventDate!)
    : null;
  
  // Next major release: earliest future major event
  const futureMajor = futureEvents.filter(e => e.isMajor);
  const nextMajor = futureMajor.length > 0
    ? futureMajor.reduce((min, e) => (e.eventDate! < min ? e.eventDate! : min), futureMajor[0].eventDate!)
    : null;
  
  // Update work
  await db
    .update(works)
    .set({
      originalPublicationDate: originalDate,
      latestMajorReleaseDate: latestMajor,
      latestAnyReleaseDate: latestAny,
      nextMajorReleaseDate: nextMajor,
      updatedAt: now,
    })
    .where(eq(works.id, workId))
    .execute();
}

/**
 * Calculate match confidence score between two potential works
 * Returns 0-100, where 100 is perfect match
 */
export function calculateMatchScore(
  a: { title: string; authors: string[]; isbn?: string | null },
  b: { title: string; authors: string[]; isbn?: string | null }
): number {
  let score = 0;
  
  // Title match (40 points)
  const normA = normalizeTitle(a.title);
  const normB = normalizeTitle(b.title);
  
  // Extract series info for better matching
  const seriesA = extractSeriesInfo(normA);
  const seriesB = extractSeriesInfo(normB);
  
  // Compare base titles (without series numbers)
  if (normalizeTitle(seriesA.title) === normalizeTitle(seriesB.title)) {
    score += 40;
    
    // Bonus if series numbers match or one is missing
    if (seriesA.seriesNumber === seriesB.seriesNumber) {
      score += 10;
    } else if (seriesA.seriesNumber !== null && seriesB.seriesNumber !== null) {
      // Different series numbers = probably different books
      score -= 30;
    }
  } else {
    // Partial title match (substring)
    const shorter = normA.length < normB.length ? normA : normB;
    const longer = normA.length < normB.length ? normB : normA;
    if (longer.includes(shorter) && shorter.length > 5) {
      score += 20;
    }
  }
  
  // Primary author match (30 points)
  const primaryA = a.authors[0]?.toLowerCase().trim();
  const primaryB = b.authors[0]?.toLowerCase().trim();
  
  if (primaryA && primaryB) {
    if (primaryA === primaryB) {
      score += 30;
    } else {
      // Check last name match (common for "First Last" vs "Last, First")
      const lastNameA = primaryA.split(/\s+/).pop() || "";
      const lastNameB = primaryB.split(/\s+/).pop() || "";
      if (lastNameA && lastNameB && lastNameA === lastNameB && lastNameA.length > 3) {
        score += 20;
      }
    }
  }
  
  // ISBN match (20 points)
  if (a.isbn && b.isbn) {
    const isbnA = a.isbn.replace(/[^0-9X]/gi, "");
    const isbnB = b.isbn.replace(/[^0-9X]/gi, "");
    
    // Exact match
    if (isbnA === isbnB) {
      score += 20;
    } else if (isbnA.length >= 9 && isbnB.length >= 9) {
      // Prefix match (first 9 digits for ISBN-10, first 12 for ISBN-13)
      const prefixLen = Math.min(isbnA.length, isbnB.length) - 1;
      const prefixA = isbnA.substring(0, prefixLen);
      const prefixB = isbnB.substring(0, prefixLen);
      
      if (prefixA === prefixB) {
        score += 10;
      }
    }
  }
  
  // Cap at 100
  return Math.min(100, Math.max(0, score));
}
