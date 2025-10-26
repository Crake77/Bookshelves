import 'dotenv/config';
import { fetch } from 'undici';
import { eq, and, or, isNotNull, desc, sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
  works,
  editions,
  books,
  sourceSnapshots,
  type Work,
  type Edition,
  type Book,
  type InsertSourceSnapshot,
  type SourceSnapshot,
} from '@shared/schema';
import { sha256 } from '../utils/hash.js';
import { lookupOpenLibraryByISBN, type OpenLibraryEvidence } from './clients/openLibrary.js';
import { fetchWikipediaExtract } from './clients/wikipedia.js';
import { fetchGoogleBooksByISBN, fetchGoogleBooksById } from './clients/googleBooks.js';

type SourceName = SourceSnapshot['source'];

const REQUIRED_SOURCES: SourceName[] = ['openlibrary', 'wikipedia'];
const DEFAULT_SOURCES: SourceName[] = [...REQUIRED_SOURCES, 'googlebooks'];
const STALE_DAYS = Number(process.env.EVIDENCE_STALE_DAYS ?? '90');
const EXTRACT_CHAR_LIMIT = Number(process.env.EVIDENCE_EXTRACT_LIMIT ?? '1800');
const WIKIDATA_ENTITY_URL = 'https://www.wikidata.org/wiki/Special:EntityData';
const USER_AGENT = process.env.WIKIDATA_USER_AGENT ?? 'BookshelvesHarvester/1.0 (+https://bookshelves.app)';

export interface ISBNDetails {
  editionId?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  googleBooksId?: string | null;
  legacyBookId?: string | null;
}

export interface WikipediaTitle {
  title: string;
  lang: string;
}

export interface BuildEvidenceOptions {
  workId: string;
  force?: boolean;
  sources?: SourceName[];
}

export interface BuildEvidenceResult {
  workId: string;
  updatedSources: SourceName[];
  skippedSources: Array<{ source: SourceName; reason: string }>;
}

export const DEFAULT_REQUIRED_SOURCES = REQUIRED_SOURCES;

/**
 * Resolve an ISBN (prefer ISBN-13) for a work using its editions table.
 */
export async function getISBNForWork(work: Work): Promise<ISBNDetails | null> {
  const preferEdition = work.displayEditionId
    ? await db.query.editions.findFirst({
        where: eq(editions.id, work.displayEditionId),
      })
    : null;

  if (preferEdition && (preferEdition.isbn13 || preferEdition.isbn10)) {
    return {
      editionId: preferEdition.id,
      isbn13: preferEdition.isbn13,
      isbn10: preferEdition.isbn10,
      googleBooksId: preferEdition.googleBooksId ?? null,
      legacyBookId: preferEdition.legacyBookId ?? null,
    };
  }

  const [fallback] = await db
    .select()
    .from(editions)
    .where(
      and(
        eq(editions.workId, work.id),
        or(isNotNull(editions.isbn13), isNotNull(editions.isbn10)),
      ),
    )
    .orderBy(desc(editions.publicationDate), desc(editions.createdAt))
    .limit(1);

  if (!fallback) return null;

  return {
    editionId: fallback.id,
    isbn13: fallback.isbn13,
    isbn10: fallback.isbn10,
    googleBooksId: fallback.googleBooksId ?? null,
    legacyBookId: fallback.legacyBookId ?? null,
  };
}

/**
 * Try to derive the best Wikipedia title for a work (preferring sitelinks from Wikidata).
 */
export async function getWikipediaTitleForWork(work: Work): Promise<WikipediaTitle> {
  if (work.workRefType === 'wikidata' && work.workRefValue) {
    const resolved = await resolveWikipediaTitleFromWikidata(work.workRefValue);
    if (resolved) {
      return resolved;
    }
  }

  return {
    title: work.title,
    lang: (process.env.WIKIPEDIA_LANG ?? 'en').toLowerCase(),
  };
}

async function resolveWikipediaTitleFromWikidata(qid: string): Promise<WikipediaTitle | null> {
  const trimmed = qid.trim();
  if (!trimmed) return null;

  const url = `${WIKIDATA_ENTITY_URL}/${encodeURIComponent(trimmed)}.json?flavor=simple`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as any;
    const entity = payload?.entities?.[trimmed];
    const sitelinks = entity?.sitelinks;
    if (!sitelinks) return null;

    const enCandidate = sitelinks.enwiki;
    const fallback = enCandidate ?? Object.values(sitelinks)[0];
    if (!fallback?.title) return null;
    const site: string = fallback.site ?? 'enwiki';
    const lang = site.replace('wiki', '') || 'en';
    return { title: fallback.title, lang };
  } catch (error) {
    console.warn(`[wikidata] failed to resolve sitelinks for ${qid}`, error);
    return null;
  }
}

/**
 * Determine whether a work needs re-harvesting (missing sources or staleness > N days).
 */
export async function needsReharvest(
  workId: string,
  requiredSources: SourceName[] = REQUIRED_SOURCES,
  staleDays: number = STALE_DAYS,
): Promise<boolean> {
  const snapshots = await db
    .select()
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.workId, workId));

  if (snapshots.length === 0) {
    return true;
  }

  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  const missingSource = requiredSources.some((source) => !snapshots.some((snap) => snap.source === source));
  if (missingSource) {
    return true;
  }

  return snapshots.some((snap) => {
    const fetchedAt = snap.fetchedAt ? new Date(snap.fetchedAt) : null;
    return !fetchedAt || fetchedAt < cutoff;
  });
}

function truncateExtract(text: string, maxLength: number = EXTRACT_CHAR_LIMIT): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildOpenLibraryExtract(evidence: OpenLibraryEvidence): string | null {
  const segments: string[] = [];
  const title = evidence.work?.title ?? evidence.edition?.title;
  if (title) segments.push(`Title: ${title}`);
  if (evidence.work?.description) segments.push(`Description: ${evidence.work.description}`);
  if (evidence.work?.excerpt) segments.push(`Excerpt: ${evidence.work.excerpt}`);
  if (evidence.subjects.length) segments.push(`Subjects: ${evidence.subjects.slice(0, 25).join(', ')}`);
  if (evidence.edition?.publishDate) segments.push(`Publication: ${evidence.edition.publishDate}`);
  if (evidence.edition?.languages.length) segments.push(`Languages: ${evidence.edition.languages.join(', ')}`);

  const extract = segments.join('\n\n').trim();
  return extract ? truncateExtract(extract) : null;
}

function buildWikipediaExtract(extract: string, categories: string[]): string {
  const parts = [extract.trim()];
  if (categories.length) {
    parts.push(`Categories: ${categories.slice(0, 20).join(', ')}`);
  }
  return truncateExtract(parts.join('\n\n'));
}

function buildGoogleBooksExtract(
  title: string,
  description?: string,
  categories: string[] = [],
): string | null {
  const sections: string[] = [`Title: ${title}`];
  if (description) {
    sections.push(`Description: ${description}`);
  }
  if (categories.length) {
    sections.push(`Categories: ${categories.slice(0, 20).join(', ')}`);
  }
  const extract = sections.join('\n\n').trim();
  return extract ? truncateExtract(extract) : null;
}

async function loadLegacyBook(legacyBookId?: string | null): Promise<Book | null> {
  if (!legacyBookId) return null;
  return db.query.books.findFirst({ where: eq(books.id, legacyBookId) });
}

async function upsertSnapshot(snapshot: InsertSourceSnapshot): Promise<void> {
  await db
    .insert(sourceSnapshots)
    .values(snapshot)
    .onConflictDoUpdate({
      target: [sourceSnapshots.workId, sourceSnapshots.source],
      set: {
        sourceKey: snapshot.sourceKey,
        revision: snapshot.revision,
        url: snapshot.url,
        license: snapshot.license,
        fetchedAt: sql`now()`,
        sha256: snapshot.sha256,
        extract: snapshot.extract,
        objectUri: snapshot.objectUri ?? null,
      },
    });
}

export async function buildAndPersistEvidence(options: BuildEvidenceOptions): Promise<BuildEvidenceResult> {
  const { workId, force = false, sources = DEFAULT_SOURCES } = options;

  const work = await db.query.works.findFirst({ where: eq(works.id, workId) });
  if (!work) {
    throw new Error(`Work ${workId} not found`);
  }

  if (!force) {
    const stale = await needsReharvest(workId, sources);
    if (!stale) {
      return { workId, updatedSources: [], skippedSources: sources.map((source) => ({ source, reason: 'fresh' })) };
    }
  }

  const updatedSources: SourceName[] = [];
  const skippedSources: Array<{ source: SourceName; reason: string }> = [];
  const isbnDetails = await getISBNForWork(work);

  // OpenLibrary evidence
  if (sources.includes('openlibrary')) {
    const isbn = isbnDetails?.isbn13 ?? isbnDetails?.isbn10;
    if (!isbn) {
      skippedSources.push({ source: 'openlibrary', reason: 'no ISBN available' });
    } else {
      const evidence = await lookupOpenLibraryByISBN(isbn);
      if (!evidence) {
        skippedSources.push({ source: 'openlibrary', reason: 'no OpenLibrary match' });
      } else {
        const extract = buildOpenLibraryExtract(evidence);
        if (!extract) {
          skippedSources.push({ source: 'openlibrary', reason: 'empty extract' });
        } else {
          await upsertSnapshot({
            workId,
            source: 'openlibrary',
            sourceKey: evidence.work?.workId ?? evidence.edition?.editionId ?? isbn,
            revision: evidence.work?.revision?.toString() ?? evidence.edition?.revision?.toString() ?? null,
            url: evidence.work?.url ?? evidence.edition?.url ?? null,
            license: evidence.license,
            sha256: sha256(extract),
            extract,
          });
          updatedSources.push('openlibrary');
        }
      }
    }
  }

  // Wikipedia evidence
  if (sources.includes('wikipedia')) {
    const wikiTarget = await getWikipediaTitleForWork(work);
    const page = await fetchWikipediaExtract({ title: wikiTarget.title, lang: wikiTarget.lang, introOnly: true, charLimit: EXTRACT_CHAR_LIMIT });
    if (!page) {
      skippedSources.push({ source: 'wikipedia', reason: 'no extract returned' });
    } else {
      const extract = buildWikipediaExtract(page.extract, page.categories);
      await upsertSnapshot({
        workId,
        source: 'wikipedia',
        sourceKey: page.title,
        revision: page.revisionId ?? null,
        url: page.url,
        license: page.license,
        sha256: sha256(extract),
        extract,
      });
      updatedSources.push('wikipedia');
    }
  }

  // Google Books evidence
  if (sources.includes('googlebooks')) {
    const isbn = isbnDetails?.isbn13 ?? isbnDetails?.isbn10;
    const googleIdFromEdition = isbnDetails?.googleBooksId ?? null;
    const preferredGoogleId = googleIdFromEdition || null;
    const legacyBookId = isbnDetails?.legacyBookId ?? null;

    if (!isbn && !preferredGoogleId && !legacyBookId) {
      skippedSources.push({ source: 'googlebooks', reason: 'no ISBN, Google Books ID, or legacy book available' });
    } else {
      const evidence = isbn
        ? await fetchGoogleBooksByISBN(isbn)
        : preferredGoogleId
          ? await fetchGoogleBooksById(preferredGoogleId)
          : null;
      const legacyBook = !evidence && legacyBookId ? await loadLegacyBook(legacyBookId) : null;
      if (!evidence) {
        if (!legacyBook) {
          skippedSources.push({ source: 'googlebooks', reason: 'no Google Books match' });
        } else {
          const extract = buildGoogleBooksExtract(
            legacyBook.title,
            legacyBook.description ?? undefined,
            legacyBook.categories ?? [],
          );
          if (!extract) {
            skippedSources.push({ source: 'googlebooks', reason: 'no usable data in legacy book' });
          } else {
            await upsertSnapshot({
              workId,
              source: 'googlebooks',
              sourceKey: legacyBook.googleBooksId ?? legacyBook.id,
              revision: legacyBook.publishedDate ?? null,
              url: legacyBook.googleBooksId
                ? `https://books.google.com/books?id=${legacyBook.googleBooksId}`
                : null,
              license: 'GOOGLE_BOOKS_TOS',
              sha256: sha256(extract),
              extract,
            });
            updatedSources.push('googlebooks');
          }
        }
      } else {
        const extract = buildGoogleBooksExtract(evidence.title, evidence.description, evidence.categories);
        if (!extract) {
          skippedSources.push({ source: 'googlebooks', reason: 'empty extract' });
        } else {
          await upsertSnapshot({
            workId,
            source: 'googlebooks',
            sourceKey: evidence.volumeId,
            revision: evidence.publishedDate ?? null,
            url: evidence.previewLink ?? evidence.infoLink ?? null,
            license: 'GOOGLE_BOOKS_TOS',
            sha256: sha256(extract),
            extract,
          });
          updatedSources.push('googlebooks');
        }
      }
    }
  }

  return { workId, updatedSources, skippedSources };
}
