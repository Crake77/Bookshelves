export type { BookSearchResult } from '../../api/search';

export const API_BASE = import.meta.env.VITE_API_BASE || '';

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

export const Api = {
  browseRows: () =>
    getJSON<{ rows: Array<{ id: string; title: string; items: BookSearchResult[] }> }>(`/api/browse/rows`),
  search: (q: string, page = 1) =>
    getJSON<{ items: BookSearchResult[]; total: number; page: number }>(
      `/api/search?q=${encodeURIComponent(q)}&page=${page}`
    ),
};
