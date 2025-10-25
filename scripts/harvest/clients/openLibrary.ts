import { fetch } from 'undici';
import { RateLimiter } from '../../utils/rateLimit.js';

const API_BASE = 'https://openlibrary.org';
const USER_AGENT = process.env.OPENLIBRARY_USER_AGENT ?? 'BookshelvesHarvester/1.0 (+https://bookshelves.app)';
const rateLimiter = new RateLimiter(250, 150);

const OPEN_LIBRARY_LICENSE = 'CC0';

type RawEdition = {
  key: string;
  title: string;
  publish_date?: string;
  number_of_pages?: number;
  languages?: Array<{ key: string }>;
  subjects?: string[];
  subject_people?: string[];
  subject_places?: string[];
  subject_times?: string[];
  revision?: number;
  last_modified?: { value?: string };
  works?: Array<{ key: string }>;
  covers?: number[];
  isbn_10?: string[];
  isbn_13?: string[];
  description?: string | { value?: string };
};

type RawWork = {
  key: string;
  title: string;
  description?: string | { value?: string };
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  revision?: number;
  last_modified?: { value?: string };
  excerpts?: Array<{ comment?: string; text: string }>;
  links?: Array<{ title?: string; url: string }>;
  covers?: number[];
};

interface OpenLibrarySearchResponse {
  docs?: Array<{
    key: string;
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    subject?: string[];
  }>;
}

export interface OpenLibraryWorkData {
  workId: string;
  title: string;
  description?: string;
  subjects: string[];
  subjectPlaces: string[];
  subjectTimes: string[];
  revision?: number;
  lastModified?: string;
  excerpt?: string;
  url: string;
}

export interface OpenLibraryEditionData {
  editionId: string;
  title: string;
  publishDate?: string;
  numberOfPages?: number;
  languages: string[];
  subjects: string[];
  revision?: number;
  lastModified?: string;
  isbn10?: string[];
  isbn13?: string[];
  coverImage?: string;
  url: string;
}

export interface OpenLibraryEvidence {
  work?: OpenLibraryWorkData;
  edition?: OpenLibraryEditionData;
  subjects: string[];
  coverImage?: string;
  source: 'openlibrary';
  license: string;
}

export interface OpenLibrarySearchResult {
  workId: string;
  title: string;
  authorNames: string[];
  firstPublishYear?: number;
  subjects: string[];
  url: string;
}

function normalizeIsbn(isbn: string): string | null {
  const digits = isbn.replace(/[^0-9X]/gi, '').toUpperCase();
  if (digits.length === 10 || digits.length === 13) {
    return digits;
  }
  return null;
}

async function requestJson<T>(input: string): Promise<T | null> {
  const url = input.startsWith('http') ? input : `${API_BASE}${input}`;
  try {
    await rateLimiter.wait();
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.warn(`[openlibrary] request failed (${response.status}): ${url}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[openlibrary] request error: ${error}`);
    return null;
  }
}

function normaliseWorkKey(workKey: string): string {
  if (workKey.startsWith('/works/')) {
    return workKey;
  }
  const trimmed = workKey.replace(/^\/+/, '');
  if (trimmed.startsWith('works/')) {
    return `/${trimmed}`;
  }
  return `/works/${trimmed}`;
}

function readText(value?: string | { value?: string }): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  return typeof value.value === 'string' ? value.value.trim() || undefined : undefined;
}

function dedupeStrings(...lists: Array<string[] | undefined>): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const value of list) {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed) {
        set.add(trimmed);
      }
    }
  }
  return Array.from(set);
}

function extractLanguages(raw?: Array<{ key: string }>): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => entry.key?.split('/')?.pop())
    .filter((lang): lang is string => Boolean(lang));
}

function buildCoverUrlById(id: number, size: 'S' | 'M' | 'L' = 'L'): string {
  return `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`;
}

function coverFromEdition(raw: RawEdition): string | undefined {
  if (Array.isArray(raw.covers) && raw.covers.length > 0) {
    return buildCoverUrlById(raw.covers[0]);
  }
  if (raw.isbn_13?.length) {
    return `https://covers.openlibrary.org/b/isbn/${raw.isbn_13[0]}-L.jpg`;
  }
  if (raw.isbn_10?.length) {
    return `https://covers.openlibrary.org/b/isbn/${raw.isbn_10[0]}-L.jpg`;
  }
  return undefined;
}

function coverFromWork(raw?: RawWork | null): string | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw.covers) && raw.covers.length > 0) {
    return buildCoverUrlById(raw.covers[0]);
  }
  return undefined;
}

function mapEdition(raw: RawEdition): OpenLibraryEditionData {
  return {
    editionId: raw.key?.replace('/books/', '') ?? raw.key,
    title: raw.title,
    publishDate: raw.publish_date,
    numberOfPages: raw.number_of_pages,
    languages: extractLanguages(raw.languages),
    subjects: dedupeStrings(raw.subjects, raw.subject_people, raw.subject_places, raw.subject_times),
    revision: raw.revision,
    lastModified: raw.last_modified?.value,
    isbn10: raw.isbn_10,
    isbn13: raw.isbn_13,
    coverImage: coverFromEdition(raw),
    url: `${API_BASE}${raw.key}`,
  };
}

function mapWork(raw: RawWork): OpenLibraryWorkData {
  const workId = raw.key?.replace('/works/', '') ?? raw.key;
  const excerpt = raw.excerpts?.[0]?.text?.trim();

  return {
    workId,
    title: raw.title,
    description: readText(raw.description),
    subjects: dedupeStrings(raw.subjects),
    subjectPlaces: dedupeStrings(raw.subject_places),
    subjectTimes: dedupeStrings(raw.subject_times),
    revision: raw.revision,
    lastModified: raw.last_modified?.value,
    excerpt: excerpt || undefined,
    url: `${API_BASE}${raw.key}`,
  };
}

async function fetchEditionByISBN(isbn: string): Promise<RawEdition | null> {
  return requestJson<RawEdition>(`/isbn/${isbn}.json`);
}

async function fetchWorkRaw(workKey: string): Promise<RawWork | null> {
  const key = normaliseWorkKey(workKey);
  return requestJson<RawWork>(`${key}.json`);
}

export async function fetchOpenLibraryWork(workKey: string): Promise<OpenLibraryWorkData | null> {
  const raw = await fetchWorkRaw(workKey);
  if (!raw) return null;
  return mapWork(raw);
}

export async function lookupOpenLibraryByISBN(isbn: string): Promise<OpenLibraryEvidence | null> {
  const normalized = normalizeIsbn(isbn);
  if (!normalized) {
    return null;
  }

  const editionRaw = await fetchEditionByISBN(normalized);
  if (!editionRaw) {
    return null;
  }

  const edition = mapEdition(editionRaw);
  const workRef = editionRaw.works?.[0]?.key;
  const workRaw = workRef ? await fetchWorkRaw(workRef) : null;
  const work = workRaw ? mapWork(workRaw) : undefined;

  const subjects = dedupeStrings(
    edition.subjects,
    editionRaw.subject_people,
    editionRaw.subject_places,
    editionRaw.subject_times,
    work?.subjects,
    work?.subjectPlaces,
    work?.subjectTimes
  );

  const coverImage = edition.coverImage ?? coverFromWork(workRaw);

  return {
    work,
    edition,
    subjects,
    coverImage,
    source: 'openlibrary',
    license: OPEN_LIBRARY_LICENSE,
  };
}

export async function searchOpenLibraryWorks(query: string, limit: number = 5): Promise<OpenLibrarySearchResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: 'key,title,author_name,first_publish_year,subject',
  });

  const data = await requestJson<OpenLibrarySearchResponse>(`/search.json?${params.toString()}`);
  if (!data?.docs) return [];

  return data.docs.slice(0, limit).map((doc) => {
    const workId = doc.key?.replace('/works/', '') ?? doc.key;
    return {
      workId,
      title: doc.title,
      authorNames: Array.isArray(doc.author_name) ? doc.author_name : [],
      firstPublishYear: doc.first_publish_year,
      subjects: Array.isArray(doc.subject) ? doc.subject.slice(0, 10) : [],
      url: `${API_BASE}${doc.key}`,
    };
  }).filter((result) => Boolean(result.workId));
}
