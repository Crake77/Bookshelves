// Vercel serverless function for book-related endpoints (editions and series-info)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { googleBooksId, endpoint } = req.query;
    
    if (!googleBooksId || typeof googleBooksId !== "string") {
      return res.status(400).json({ error: "googleBooksId is required" });
    }

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    const sql = neon(process.env.DATABASE_URL);

    // Route based on endpoint parameter
    if (endpoint === "editions") {
      // Find edition by googleBooksId
      let edition = await sql`
        SELECT id, work_id, legacy_book_id, format, publication_date, language, market,
               isbn10, isbn13, google_books_id, open_library_id, edition_statement,
               page_count, categories, cover_url, is_manual, created_at
        FROM editions
        WHERE google_books_id = ${googleBooksId}
        LIMIT 1
      `;

      let workId: string | null = null;
      let canonicalSource: any = edition[0] ?? null;

      // Fallback: If no edition found, check legacy books table and find edition via legacyBookId
      if (edition.length === 0) {
        const legacyBook = await sql`
          SELECT id, google_books_id, isbn, page_count, categories, cover_url, published_date
          FROM books
          WHERE google_books_id = ${googleBooksId}
          LIMIT 1
        `;

        if (legacyBook.length === 0) {
          return res.json([]);
        }

        // Check if there's an edition linked to this legacy book
        const linkedEdition = await sql`
          SELECT id, work_id, legacy_book_id, format, publication_date, language, market,
                 isbn10, isbn13, google_books_id, open_library_id, edition_statement,
                 page_count, categories, cover_url, is_manual, created_at
          FROM editions
          WHERE legacy_book_id = ${legacyBook[0].id}
          LIMIT 1
        `;

        if (linkedEdition.length > 0) {
          // Found migrated edition, use it
          edition = linkedEdition;
          workId = linkedEdition[0].work_id;
          canonicalSource = linkedEdition[0];
        } else {
          // Not migrated yet, create a mock edition from the legacy book
          const mockEdition = {
            id: legacyBook[0].id,
            work_id: legacyBook[0].id,
            legacy_book_id: legacyBook[0].id,
            format: "unknown",
            publication_date: legacyBook[0].published_date ? new Date(legacyBook[0].published_date) : null,
            language: null,
            market: null,
            isbn10: legacyBook[0].isbn?.length === 10 ? legacyBook[0].isbn : null,
            isbn13: legacyBook[0].isbn?.length === 13 ? legacyBook[0].isbn : null,
            google_books_id: legacyBook[0].google_books_id,
            open_library_id: null,
            edition_statement: null,
            page_count: legacyBook[0].page_count,
            categories: legacyBook[0].categories || [],
            cover_url: legacyBook[0].cover_url,
            is_manual: false,
            created_at: new Date(),
            events: [],
          };

          return res.json([mockEdition]);
        }
      } else {
        workId = edition[0].work_id;
      }

      // Get work info to check for OpenLibrary work ID
      const workInfo = await sql`
        SELECT work_ref_type, work_ref_value, title, authors
        FROM works
        WHERE id = ${workId}
        LIMIT 1
      `;
      const workRecord = workInfo[0];

      // Get all editions from database
      const dbEditions = await sql`
        SELECT id, work_id, legacy_book_id, format, publication_date, language, market,
               isbn10, isbn13, google_books_id, open_library_id, edition_statement,
               page_count, categories, cover_url, is_manual, created_at
        FROM editions
        WHERE work_id = ${workId}
      `;

      // Try to fetch additional editions from OpenLibrary if we have a work reference
      let openLibraryEditions: any[] = [];
      let openLibraryWorkKey: string | null = null;
      if (workRecord?.work_ref_type === "openlibrary" && workRecord.work_ref_value) {
        openLibraryWorkKey = workRecord.work_ref_value;
      } else {
        openLibraryWorkKey = await resolveOpenLibraryWorkKey({
          title: workRecord?.title,
          author: Array.isArray(workRecord?.authors) ? workRecord?.authors?.[0] : workRecord?.authors,
          isbn10: dbEditions[0]?.isbn10 ?? null,
          isbn13: dbEditions[0]?.isbn13 ?? null,
        });
      }

      if (workId && openLibraryWorkKey) {
        openLibraryEditions = await fetchOpenLibraryEditions(workId, openLibraryWorkKey);
      }

      // Combine database editions with OpenLibrary editions
      // Use a Set to track which ISBNs/OLIDs we've seen to avoid duplicates
      const seenIds = new Set<string>();
      const allEditions: any[] = [];

      // Add database editions first (these are the source of truth)
      for (const e of dbEditions) {
        const key = e.isbn13 || e.isbn10 || e.open_library_id || e.id;
        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          allEditions.push(e);
        }
      }

      // Add OpenLibrary editions that aren't duplicates
      for (const e of openLibraryEditions) {
        const key = e.isbn13 || e.isbn10 || e.openLibraryId || e.id;
        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          allEditions.push(e);
        }
      }

      // Filter to only high-quality covers (no scans, barcodes, or low-quality indicators)
      // Also exclude audiobooks entirely - they shouldn't be used as cover options
      const qualityEditions = allEditions.filter((e: any) => {
        if (!e.cover_url && !e.coverUrl) return false;
        
        // Exclude audiobooks entirely
        const format = (e.format || "").toLowerCase();
        if (format.includes("audio") || format.includes("audiobook")) return false;
        
        const url = (e.cover_url || e.coverUrl || "").toLowerCase();
        // Reject low-quality indicators
        if (url.includes("edge=curl") || url.includes("edge=shadow")) return false;
        // Reject barcodes (common patterns in scan URLs)
        if (url.includes("barcode") || url.includes("scan") || url.includes("scanned")) return false;
        // Reject very small images or placeholder images
        if (url.includes("&img=0") || url.includes("no-cover") || url.includes("nocover")) return false;
        return true;
      });

      // Map to expected format, normalize metadata, and sort for display
      const normalizedRecords = (qualityEditions.length > 0 ? qualityEditions : allEditions).map((record: any) =>
        normalizeEditionRecord(record, workId),
      );

      let finalPayload = sortEditionsForDisplay(normalizedRecords);

      // Only add canonical source if it's not already included AND it's high quality
      // Don't override the sorted list if canonical is low quality
      if (canonicalSource) {
        const canonical = normalizeEditionRecord(canonicalSource, workId);
        const alreadyIncluded = finalPayload.some(
          (edition) =>
            edition.id === canonical.id ||
            (!!edition.googleBooksId && !!canonical.googleBooksId && edition.googleBooksId === canonical.googleBooksId),
        );
        if (!alreadyIncluded && canonical.coverUrl) {
          // Only add canonical if it's high quality (not a scan)
          const canonicalQuality = getCoverQualityScore(canonical);
          if (canonicalQuality >= 50) {
            // Add to the appropriate position based on sorting, not just front
            // Insert it in the correct sorted position
            const insertIndex = finalPayload.findIndex((edition) => {
              const editionQuality = getCoverQualityScore(edition);
              const canonicalEnglish = isEnglishEdition(canonical) ? 0 : 1;
              const editionEnglish = isEnglishEdition(edition) ? 0 : 1;
              
              // Find position where canonical should go
              if (canonicalEnglish !== editionEnglish) {
                return canonicalEnglish > editionEnglish; // Insert before non-English
              }
              if (canonicalQuality > editionQuality) {
                return false; // Keep looking, canonical is better
              }
              if (canonicalQuality < editionQuality) {
                return true; // Insert here, canonical is worse
              }
              // Same quality, check date
              const canonicalDate = getPublicationTimestamp(canonical);
              const editionDate = getPublicationTimestamp(edition);
              if (canonicalDate > editionDate) {
                return false; // Keep looking, canonical is newer
              }
              return canonicalDate < editionDate; // Insert here, canonical is older
            });
            
            if (insertIndex === -1) {
              finalPayload.push(canonical);
            } else {
              finalPayload.splice(insertIndex, 0, canonical);
            }
          }
          // If canonical is low quality, don't add it - let the sorted list handle defaults
        }
      }

      if (finalPayload.length === 0) {
        const fallback = await sql`
          SELECT id, cover_url, published_date, isbn, categories
          FROM books
          WHERE google_books_id = ${googleBooksId}
          LIMIT 1
        `;
        if (fallback.length > 0) {
          finalPayload = [
            {
              id: fallback[0].id,
              workId,
              legacyBookId: fallback[0].id,
              format: "unknown",
              publicationDate: serializeDate(fallback[0].published_date),
              language: null,
              market: null,
              isbn10: null,
              isbn13: fallback[0].isbn || null,
              googleBooksId: googleBooksId,
              openLibraryId: null,
              editionStatement: null,
              pageCount: null,
              categories: fallback[0].categories || [],
              coverUrl: fallback[0].cover_url,
              isManual: false,
              createdAt: new Date().toISOString(),
              events: [],
            },
          ];
        }
      }

      return res.json(finalPayload);
    } else if (endpoint === "series-info") {
      // Find edition by googleBooksId
      let edition = await sql`
        SELECT work_id
        FROM editions
        WHERE google_books_id = ${googleBooksId}
        LIMIT 1
      `;

      let workId: string | null = null;

      // Fallback: If no edition found, check legacy books table and find edition via legacyBookId
      if (edition.length === 0) {
        const legacyBook = await sql`
          SELECT id
          FROM books
          WHERE google_books_id = ${googleBooksId}
          LIMIT 1
        `;

        if (legacyBook.length === 0) {
          return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
        }

        // Find edition linked to this legacy book
        const linkedEdition = await sql`
          SELECT work_id
          FROM editions
          WHERE legacy_book_id = ${legacyBook[0].id}
          LIMIT 1
        `;

        if (linkedEdition.length === 0) {
          // No migration yet, return null
          return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
        }

        workId = linkedEdition[0].work_id;
      } else {
        workId = edition[0].work_id;
      }

      // Get work info
      const work = await sql`
        SELECT series, series_order
        FROM works
        WHERE id = ${workId}
        LIMIT 1
      `;

      if (work.length === 0) {
        return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
      }

      const seriesName = work[0].series;
      const seriesOrder = work[0].series_order;

      // Get total books in series (count works with same series name and non-null series_order)
      let totalBooksInSeries: number | null = null;
      if (seriesName) {
        const countResult = await sql`
          SELECT COUNT(*)::int as count
          FROM works
          WHERE series = ${seriesName} AND series_order IS NOT NULL
        `;

        totalBooksInSeries = countResult[0]?.count ?? null;
      }

      return res.json({
        series: seriesName,
        seriesOrder: seriesOrder,
        totalBooksInSeries: totalBooksInSeries,
        workId: workId,
      });
    } else {
      return res.status(400).json({ error: "Invalid endpoint. Use 'editions' or 'series-info'" });
    }
  } catch (error: any) {
    console.error("Book API error:", error);
    console.error("Error stack:", error?.stack);
    res.status(500).json({ 
      error: "Failed to process request",
      message: error?.message || "Unknown error",
      debug: process.env.NODE_ENV === "development" ? error?.stack : undefined
    });
  }
}

const OPEN_LIBRARY_EDITION_LIMIT = 100;

interface ResolveOpenLibraryWorkKeyInput {
  title?: string | null;
  author?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
}

interface EditionPayload {
  id: string;
  workId: string | null;
  legacyBookId: string | null;
  format: string;
  publicationDate: string | null;
  language: string | null;
  market: string | null;
  isbn10: string | null;
  isbn13: string | null;
  googleBooksId: string | null;
  openLibraryId: string | null;
  editionStatement: string | null;
  pageCount: number | null;
  categories: string[];
  coverUrl: string | null;
  isManual: boolean;
  createdAt: string | null;
  events: any[];
}

function normalizeEditionRecord(record: any, fallbackWorkId: string | null): EditionPayload {
  return {
    id: record.id,
    workId: record.work_id || record.workId || fallbackWorkId,
    legacyBookId: record.legacy_book_id || record.legacyBookId || null,
    format: inferEditionFormat(record),
    publicationDate: serializeDate(record.publication_date || record.publicationDate),
    language: normalizeLanguageCode(record.language ?? null),
    market: record.market || null,
    isbn10: record.isbn10 || null,
    isbn13: record.isbn13 || null,
    googleBooksId: record.google_books_id || record.googleBooksId || null,
    openLibraryId: record.open_library_id || record.openLibraryId || null,
    editionStatement: record.edition_statement || record.editionStatement || null,
    pageCount:
      typeof record.page_count === "number"
        ? record.page_count
        : typeof record.pageCount === "number"
          ? record.pageCount
          : null,
    categories: Array.isArray(record.categories) ? record.categories : [],
    coverUrl: record.cover_url || record.coverUrl || null,
    isManual: typeof record.is_manual === "boolean" ? record.is_manual : record.isManual ?? false,
    createdAt: serializeDate(record.created_at || record.createdAt),
    events: Array.isArray(record.events) ? record.events : [],
  };
}

async function fetchOpenLibraryEditions(workId: string, workRefValue: string): Promise<EditionPayload[]> {
  try {
    const workResponse = await fetch(`https://openlibrary.org/works/${workRefValue}.json`);
    if (!workResponse.ok) {
      return [];
    }

    const work = await workResponse.json();
    const editionsUrl = buildOpenLibraryEditionsUrl(work, workRefValue);
    const editionsResponse = await fetch(editionsUrl);
    if (!editionsResponse.ok) {
      return [];
    }

    const editionsData = await editionsResponse.json();
    const entries = extractOpenLibraryEditionEntries(editionsData);
    if (entries.length === 0) {
      return [];
    }

    return entries
      .slice(0, OPEN_LIBRARY_EDITION_LIMIT)
      .map((entry: any) => normalizeOpenLibraryEdition(entry, workId))
      .filter((edition) => Boolean(edition.coverUrl));
  } catch (error) {
    console.warn("Failed to fetch OpenLibrary editions:", error);
    return [];
  }
}

function buildOpenLibraryEditionsUrl(work: any, workRefValue: string): string {
  const editionsField = work?.editions;
  if (typeof editionsField === "string" && editionsField.length > 0) {
    if (editionsField.startsWith("/")) {
      return `https://openlibrary.org${editionsField}.json`;
    }
    if (editionsField.startsWith("http")) {
      return editionsField.endsWith(".json") ? editionsField : `${editionsField}.json`;
    }
  }
  return `https://openlibrary.org/works/${workRefValue}/editions.json`;
}

function extractOpenLibraryEditionEntries(editionsData: any): any[] {
  if (!editionsData) return [];
  if (Array.isArray(editionsData.entries)) {
    return editionsData.entries;
  }
  if (Array.isArray(editionsData.editions)) {
    return editionsData.editions;
  }
  if (Array.isArray(editionsData)) {
    return editionsData;
  }
  return [];
}

function normalizeOpenLibraryEdition(ed: any, workId: string): EditionPayload {
  return {
    id: `ol-${ed.key?.replace("/books/", "") || Date.now()}`,
    workId,
    legacyBookId: null,
    format: detectOpenLibraryFormat(ed),
    publicationDate: serializeDate(ed.publish_date ? new Date(ed.publish_date) : null),
    language: extractLanguageCode(ed),
    market: null,
    isbn10: Array.isArray(ed.isbn_10) ? ed.isbn_10[0] ?? null : null,
    isbn13: Array.isArray(ed.isbn_13) ? ed.isbn_13[0] ?? null : null,
    googleBooksId: null,
    openLibraryId: ed.key?.replace("/books/", "") || null,
    editionStatement: ed.edition_name ?? ed.edition_statement ?? null,
    pageCount: ed.number_of_pages ?? null,
    categories: Array.isArray(ed.subjects) ? ed.subjects : [],
    coverUrl: pickOpenLibraryCoverUrl(ed),
    isManual: false,
    createdAt: new Date().toISOString(),
    events: [],
  };
}

function inferEditionFormat(edition: any): string {
  const baseFormat =
    typeof edition.format === "string" && edition.format.length > 0 ? edition.format.toLowerCase() : "";
  if (baseFormat && baseFormat !== "unknown") {
    return normalizeFormatString(baseFormat);
  }

  return detectFormatFromStrings([
    edition.edition_statement,
    edition.market,
    ...(Array.isArray(edition.categories) ? edition.categories : []),
  ]);
}

function normalizeFormatString(format: string): string {
  if (!format) return "unknown";
  const lower = format.toLowerCase();
  if (lower.includes("hardcover") || lower.includes("hardback") || lower.includes("cloth")) return "hardcover";
  if (
    lower.includes("paperback") ||
    lower.includes("softcover") ||
    lower.includes("soft cover") ||
    lower.includes("mass market") ||
    lower.includes("trade paperback")
  ) {
    return "paperback";
  }
  if (lower.includes("ebook") || lower.includes("digital")) return "ebook";
  if (lower.includes("audio") || lower.includes("audiobook")) return "audiobook";
  return lower;
}

function detectOpenLibraryFormat(ed: any): string {
  const inputs: Array<string | undefined> = [
    ...(Array.isArray(ed.subjects) ? ed.subjects : []),
    ...(Array.isArray(ed.keywords) ? ed.keywords : []),
    ed.physical_format,
  ];
  return detectFormatFromStrings(inputs);
}

function detectFormatFromStrings(inputs: Array<string | undefined | null>): string {
  const text = inputs
    .filter(Boolean)
    .map((val) => String(val).toLowerCase())
    .join(" ");

  if (!text) {
    return "unknown";
  }

  if (
    text.includes("hardcover") ||
    text.includes("hardback") ||
    text.includes("clothbound") ||
    text.includes("cloth-bound") ||
    text.includes("clothback")
  ) {
    return "hardcover";
  }
  if (
    text.includes("paperback") ||
    text.includes("mass market") ||
    text.includes("trade paperback") ||
    text.includes("softcover") ||
    text.includes("soft cover") ||
    text.includes("mmpb") ||
    text.includes("mass-market")
  ) {
    return "paperback";
  }
  if (text.includes("ebook") || text.includes("e-book") || text.includes("kindle") || text.includes("digital")) {
    return "ebook";
  }
  if (text.includes("audiobook") || text.includes("audio book") || text.includes("audio cd")) {
    return "audiobook";
  }
  if (text.includes("library binding")) {
    return "library binding";
  }

  return "unknown";
}

function pickOpenLibraryCoverUrl(ed: any): string | null {
  const covers = Array.isArray(ed.covers) ? ed.covers : [];
  if (covers.length === 0) {
    return null;
  }
  return `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`;
}

function extractLanguageCode(ed: any): string | null {
  const languages = Array.isArray(ed.languages) ? ed.languages : [];
  const primary = languages[0];
  const key = typeof primary?.key === "string" ? primary.key : null;
  const code = key ? key.replace("/languages/", "") : null;
  return normalizeLanguageCode(code);
}

async function resolveOpenLibraryWorkKey(input: ResolveOpenLibraryWorkKeyInput): Promise<string | null> {
  const isbnCandidates = [input.isbn13, input.isbn10].filter(Boolean) as string[];
  for (const isbn of isbnCandidates) {
    const keyFromIsbn = await fetchOpenLibraryWorkKeyFromIsbn(isbn);
    if (keyFromIsbn) {
      return keyFromIsbn;
    }
  }

  if (input.title) {
    const keyFromSearch = await searchOpenLibraryWork(input.title, input.author);
    if (keyFromSearch) {
      return keyFromSearch;
    }
  }

  return null;
}

async function fetchOpenLibraryWorkKeyFromIsbn(isbn: string): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const works = Array.isArray(data?.works) ? data.works : [];
    const key = works[0]?.key;
    return typeof key === "string" ? key.replace("/works/", "") : null;
  } catch {
    return null;
  }
}

async function searchOpenLibraryWork(title: string, author?: string | null): Promise<string | null> {
  try {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("title", title);
    if (author) {
      url.searchParams.set("author", author);
    }
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString());
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const doc = Array.isArray(data?.docs) ? data.docs[0] : null;
    const key =
      (typeof doc?.key === "string" && doc.key.startsWith("/works/")) ? doc.key.replace("/works/", "") : null;
    return key ?? (typeof doc?.work_key?.[0] === "string" ? doc.work_key[0].replace("/works/", "") : null);
  } catch {
    return null;
  }
}

function normalizeLanguageCode(language: string | null): string | null {
  if (!language) return null;
  const lower = language.toLowerCase();
  if (LANGUAGE_CODE_MAP[lower]) {
    return LANGUAGE_CODE_MAP[lower];
  }
  return lower;
}

const LANGUAGE_CODE_MAP: Record<string, string> = {
  eng: "en",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  english: "en",
  fre: "fr",
  fra: "fr",
  fr: "fr",
  spa: "es",
  es: "es",
  ita: "it",
  it: "it",
  ger: "de",
  deu: "de",
  de: "de",
  por: "pt",
  pt: "pt",
  rus: "ru",
  ru: "ru",
  jpn: "ja",
  ja: "ja",
  chi: "zh",
  zho: "zh",
  zh: "zh",
};

const ENGLISH_LANGUAGE_CODES = new Set(["en", "en-us", "en-gb", "english"]);
const ENGLISH_KEYWORDS = ["english", "us", "u.s.", "united states", "american", "uk", "british", "canada", "australia"];

function sortEditionsForDisplay(editions: EditionPayload[]): EditionPayload[] {
  return [...editions].sort((a, b) => {
    // Priority 1: English editions first
    const aEnglish = isEnglishEdition(a) ? 0 : 1;
    const bEnglish = isEnglishEdition(b) ? 0 : 1;
    if (aEnglish !== bEnglish) {
      return aEnglish - bEnglish;
    }

    // Priority 2: Cover quality score (higher is better)
    const aQuality = getCoverQualityScore(a);
    const bQuality = getCoverQualityScore(b);
    if (aQuality !== bQuality) {
      return bQuality - aQuality; // Higher quality first
    }

    // Priority 3: Newer publication dates first
    const dateDiff = getPublicationTimestamp(b) - getPublicationTimestamp(a);
    if (Math.abs(dateDiff) > 86400000) { // Only if difference is more than 1 day
      return dateDiff;
    }

    // Priority 4: Prefer physical formats (paperback, hardcover) over digital/audio
    const aFormat = getFormatPriority(a.format);
    const bFormat = getFormatPriority(b.format);
    if (aFormat !== bFormat) {
      return bFormat - aFormat; // Higher priority format first
    }

    // Priority 5: Prefer editions with Google Books IDs (often cleaner covers)
    const aHasGoogle = Boolean(a.googleBooksId);
    const bHasGoogle = Boolean(b.googleBooksId);
    if (aHasGoogle !== bHasGoogle) {
      return aHasGoogle ? -1 : 1;
    }

    // Priority 6: Prefer editions with ISBNs (more official)
    const aHasIsbn = Boolean(a.isbn13 || a.isbn10);
    const bHasIsbn = Boolean(b.isbn13 || b.isbn10);
    if (aHasIsbn !== bHasIsbn) {
      return aHasIsbn ? -1 : 1;
    }

    // Final tie-breaker: alphabetical by format
    return (a.format || "").localeCompare(b.format || "");
  });
}

/**
 * Score cover quality based on URL characteristics
 * Higher score = better quality
 */
function getCoverQualityScore(edition: EditionPayload): number {
  const url = (edition.coverUrl || "").toLowerCase();
  let score = 50; // Base score

  // Penalize low-quality indicators
  if (url.includes("edge=curl") || url.includes("edge=shadow")) {
    score -= 30;
  }
  if (url.includes("barcode") || url.includes("scan") || url.includes("scanned")) {
    score -= 40;
  }
  if (url.includes("&img=0") || url.includes("no-cover")) {
    score -= 50;
  }

  // Boost high-quality indicators
  if (url.includes("openlibrary.org")) {
    score += 20; // OpenLibrary covers are usually high quality
  }
  if (url.includes("publisher/content")) {
    score += 10; // Publisher-provided covers are usually good
  }
  if (!url.includes("edge=") && url.includes("google.com")) {
    score += 15; // Clean Google Books covers (no edge effects)
  }

  // Boost newer formats (L size is large, better quality)
  if (url.includes("-l.jpg") || url.includes("-l.jpeg")) {
    score += 10;
  } else if (url.includes("-m.jpg") || url.includes("-m.jpeg")) {
    score += 5;
  }

  return score;
}

/**
 * Get format priority for sorting
 * Physical formats preferred over digital/audio
 */
function getFormatPriority(format: string | null): number {
  if (!format) return 0;
  const lower = format.toLowerCase();
  if (lower === "paperback" || lower === "hardcover") return 10;
  if (lower === "library binding") return 8;
  if (lower === "ebook" || lower === "digital") return 5;
  if (lower === "audiobook" || lower === "audio") return 3;
  return 0;
}

function isEnglishEdition(edition: EditionPayload): boolean {
  const language = edition.language ? normalizeLanguageCode(edition.language) : null;
  if (language && ENGLISH_LANGUAGE_CODES.has(language)) {
    return true;
  }

  if (edition.googleBooksId) {
    return true;
  }

  const fields = [
    edition.market,
    edition.editionStatement,
    ...(edition.categories || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ENGLISH_KEYWORDS.some((keyword) => fields.includes(keyword));
}

function getPublicationTimestamp(edition: EditionPayload): number {
  if (!edition.publicationDate) return 0;
  const date = new Date(edition.publicationDate);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value as any);
  const time = date.getTime();
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}
