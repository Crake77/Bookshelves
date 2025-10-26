import { fetch } from 'undici';
import { RateLimiter } from '../../utils/rateLimit.js';

const rateLimiter = new RateLimiter(200, 150);
const API_BASE = 'https://www.googleapis.com/books/v1/volumes';
const USER_AGENT = process.env.GOOGLE_BOOKS_USER_AGENT ?? 'BookshelvesHarvester/1.0 (+https://bookshelves.app)';

export interface GoogleBooksEvidence {
  volumeId: string;
  title: string;
  authors: string[];
  description?: string;
  categories: string[];
  publishedDate?: string;
  language?: string;
  pageCount?: number;
  previewLink?: string;
  infoLink?: string;
}

type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    publishedDate?: string;
    language?: string;
    pageCount?: number;
    previewLink?: string;
    infoLink?: string;
  };
};

type GoogleBooksResponse = {
  items?: GoogleVolume[];
};

async function googleBooksRequest(url: string): Promise<GoogleBooksResponse | null> {
  await rateLimiter.wait();
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      console.warn(`[googlebooks] request failed (${response.status}) ${response.statusText}`);
      return null;
    }
    return (await response.json()) as GoogleBooksResponse;
  } catch (error) {
    console.warn('[googlebooks] request error', error);
    return null;
  }
}

function mapVolume(volume: GoogleVolume | undefined): GoogleBooksEvidence | null {
  if (!volume?.volumeInfo?.title) return null;
  const info = volume.volumeInfo;
  return {
    volumeId: volume.id,
    title: info.title,
    authors: Array.isArray(info.authors) ? info.authors : [],
    description: info.description ?? undefined,
    categories: Array.isArray(info.categories) ? info.categories : [],
    publishedDate: info.publishedDate ?? undefined,
    language: info.language ?? undefined,
    pageCount: info.pageCount ?? undefined,
    previewLink: info.previewLink ?? undefined,
    infoLink: info.infoLink ?? undefined,
  };
}

export async function fetchGoogleBooksByISBN(isbn: string): Promise<GoogleBooksEvidence | null> {
  const query = `${API_BASE}?q=isbn:${encodeURIComponent(isbn)}&maxResults=3`;
  const payload = await googleBooksRequest(query);
  if (!payload?.items?.length) {
    return null;
  }
  return mapVolume(payload.items[0]);
}

export async function fetchGoogleBooksById(id: string): Promise<GoogleBooksEvidence | null> {
  const url = `${API_BASE}/${encodeURIComponent(id)}`;
  await rateLimiter.wait();
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      console.warn(`[googlebooks] fetch by id failed (${response.status}) ${response.statusText}`);
      return null;
    }
    const volume = (await response.json()) as GoogleVolume;
    return mapVolume(volume);
  } catch (error) {
    console.warn('[googlebooks] fetch by id error', error);
    return null;
  }
}
