import { fetch } from 'undici';
import { RateLimiter } from '../../utils/rateLimit.js';

const DEFAULT_LANG = process.env.WIKIPEDIA_LANG ?? 'en';
const USER_AGENT = process.env.WIKIPEDIA_USER_AGENT ?? 'BookshelvesHarvester/1.0 (+https://bookshelves.app)';
const rateLimiter = new RateLimiter(200, 150); // 200ms base delay + jitter

export const WIKIPEDIA_LICENSE = 'CC-BY-SA-4.0';

type WikipediaQueryResponse = {
  query?: {
    pages?: Array<{
      pageid: number;
      title: string;
      extract?: string;
      description?: string;
      pagelanguage?: string;
      fullurl?: string;
      revisions?: Array<{ revid: number; timestamp: string }>;
      categories?: Array<{ title: string; hidden?: boolean }>;
      missing?: boolean;
    }>;
  };
};

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{ pageid: number; title: string; snippet: string; wordcount?: number }>;
  };
};

export interface WikipediaExtractOptions {
  title: string;
  lang?: string;
  introOnly?: boolean;
  charLimit?: number;
}

export interface WikipediaExtractResult {
  title: string;
  pageId: number;
  lang: string;
  revisionId?: string;
  lastModified?: string;
  url: string;
  extract: string;
  description?: string;
  categories: string[];
  license: string;
}

export interface WikipediaSearchResult {
  pageId: number;
  title: string;
  snippet: string;
  url: string;
}

async function wikipediaRequest<T>(lang: string, params: Record<string, string | number | undefined>): Promise<T | null> {
  const searchParams = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    utf8: '1',
  });

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    searchParams.set(key, String(value));
  }

  const url = `https://${lang}.wikipedia.org/w/api.php?${searchParams.toString()}`;

  try {
    await rateLimiter.wait();
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[wikipedia] request failed (${response.status}): ${response.statusText}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[wikipedia] request error for ${url}`, error);
    return null;
  }
}

function buildPageUrl(title: string, lang: string): string {
  const encoded = encodeURIComponent(title.replace(/\s/g, '_'));
  return `https://${lang}.wikipedia.org/wiki/${encoded}`;
}

function normalizeCategories(categories?: Array<{ title: string; hidden?: boolean }>): string[] {
  if (!Array.isArray(categories)) return [];
  const set = new Set<string>();
  for (const category of categories) {
    if (!category || category.hidden) continue;
    const name = category.title?.replace(/^Category:/i, '').trim();
    if (name) set.add(name);
  }
  return Array.from(set);
}

function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
}

export async function fetchWikipediaExtract(options: WikipediaExtractOptions): Promise<WikipediaExtractResult | null> {
  const { title, lang = DEFAULT_LANG, introOnly = true, charLimit = 1200 } = options;

  const data = await wikipediaRequest<WikipediaQueryResponse>(lang, {
    prop: 'extracts|revisions|categories|info',
    titles: title,
    exlimit: '1',
    redirects: '1',
    exchars: charLimit,
    exsectionformat: 'plain',
    explaintext: '1',
    rvprop: 'ids|timestamp',
    rvlimit: '1',
    cllimit: '20',
    inprop: 'url',
    ...(introOnly ? { exintro: '1' } : {}),
  });

  const page = data?.query?.pages?.[0];
  if (!page || page.missing) {
    return null;
  }

  const extract = page.extract?.trim();
  if (!extract) {
    return null;
  }

  const revision = page.revisions?.[0];

  return {
    title: page.title,
    pageId: page.pageid,
    lang,
    revisionId: revision?.revid ? String(revision.revid) : undefined,
    lastModified: revision?.timestamp,
    url: page.fullurl ?? buildPageUrl(page.title, lang),
    extract,
    description: page.description,
    categories: normalizeCategories(page.categories),
    license: WIKIPEDIA_LICENSE,
  };
}

export async function searchWikipediaPages(
  query: string,
  options: { lang?: string; limit?: number } = {}
): Promise<WikipediaSearchResult[]> {
  const { lang = DEFAULT_LANG, limit = 5 } = options;

  if (!query.trim()) return [];

  const data = await wikipediaRequest<WikipediaSearchResponse>(lang, {
    list: 'search',
    srsearch: query,
    srlimit: limit,
    srprop: 'snippet',
  });

  const results = data?.query?.search;
  if (!Array.isArray(results)) {
    return [];
  }

  return results.map((item) => ({
    pageId: item.pageid,
    title: item.title,
    snippet: stripHtml(item.snippet),
    url: buildPageUrl(item.title, lang),
  }));
}
