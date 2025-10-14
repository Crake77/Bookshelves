import { apiRequest } from "./queryClient";
import type { BookSearchResult as OpenLibraryBook } from "@shared/types";
export type { BookSearchResult as OpenLibraryBook } from "@shared/types";

export const API_BASE = import.meta.env.VITE_API_BASE || "";

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(withBase(path));
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

function withBase(url: string): string {
  if (/^https?:/i.test(url)) return url;
  return `${API_BASE}${url}`;
}

export const Api = {
  browseRows: () =>
    getJSON<{ rows: Array<{ id: string; title: string; items: OpenLibraryBook[] }> }>(
      `/api/browse/rows`
    ),
  search: (q: string, page = 1) =>
    getJSON<{ items: OpenLibraryBook[]; total: number; page: number }>(
      `/api/search?q=${encodeURIComponent(q)}&page=${page}`
    ),
};

export function mapOpenLibraryBook(result: OpenLibraryBook): BookSearchResult {
  return {
    googleBooksId: result.id,
    title: result.title ?? "Unknown Title",
    authors: result.author ? [result.author] : ["Unknown Author"],
    description: "",
    coverUrl: result.cover ?? undefined,
    publishedDate: result.year ? String(result.year) : undefined,
    pageCount: undefined,
    categories: [],
    isbn: undefined,
  };
}

export interface BookSearchResult {
  googleBooksId: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  isbn?: string;
}

export interface IngestedBook extends BookSearchResult {
  id: string;
}

export interface BookRecommendation extends BookSearchResult {
  rationale: string;
}

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  status: string; // Supports both default and custom shelf slugs
  rating: number | null; // User's rating 0-100
  addedAt: string;
  book: BookSearchResult;
}

export interface BookStats {
  id: string;
  bookId: string;
  averageRating: number | null;
  totalRatings: number;
  ranking: number | null;
  updatedAt: string;
}

// Demo user ID
export const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return [];
  const { items } = await Api.search(query.trim(), 1);
  return items.map(mapOpenLibraryBook);
}

export async function ingestBook(book: Partial<BookSearchResult>): Promise<IngestedBook> {
  const res = await apiRequest("POST", withBase("/api/ingest"), book);
  return res.json();
}

export async function getUserBooks(userId: string, status?: string): Promise<UserBook[]> {
  const url = status
    ? `/api/user-books/${userId}?status=${status}`
    : `/api/user-books/${userId}`;
  const response = await fetch(withBase(url));
  if (!response.ok) throw new Error("Failed to get user books");
  return response.json();
}

export async function addBookToShelf(
  userId: string,
  bookId: string,
  status: string
): Promise<UserBook> {
  const res = await apiRequest("POST", withBase("/api/user-books"), { userId, bookId, status });
  return res.json();
}

export async function updateBookStatus(userBookId: string, status: string): Promise<UserBook> {
  const res = await apiRequest("PATCH", withBase(`/api/user-books/${userBookId}`), { status });
  return res.json();
}

export async function removeBookFromShelf(userBookId: string): Promise<void> {
  await apiRequest("DELETE", withBase(`/api/user-books/${userBookId}`));
}

export async function getRecommendations(userId: string): Promise<BookRecommendation[]> {
  const response = await fetch(withBase(`/api/recs?userId=${userId}`));
  if (!response.ok) throw new Error("Failed to get recommendations");
  return response.json();
}

// Custom Shelves
export interface CustomShelf {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isEnabled: number;
  order: number;
  createdAt: string;
}

export async function getCustomShelves(userId: string): Promise<CustomShelf[]> {
  const response = await fetch(withBase(`/api/custom-shelves/${userId}`));
  if (!response.ok) throw new Error("Failed to get custom shelves");
  return response.json();
}

export async function createCustomShelf(userId: string, name: string, slug: string, isEnabled: number = 1, order: number = 0): Promise<CustomShelf> {
  const res = await apiRequest("POST", withBase("/api/custom-shelves"), { userId, name, slug, isEnabled, order });
  return res.json();
}

export async function updateCustomShelf(id: string, updates: Partial<Omit<CustomShelf, 'id' | 'userId' | 'createdAt'>>): Promise<CustomShelf> {
  const res = await apiRequest("PATCH", withBase(`/api/custom-shelves/${id}`), updates);
  return res.json();
}

export async function deleteCustomShelf(id: string): Promise<void> {
  await apiRequest("DELETE", withBase(`/api/custom-shelves/${id}`));
}

// Browse Categories
export interface BrowseCategoryPreference {
  id: string;
  userId: string;
  categoryType: string;
  categoryName: string;
  categorySlug: string;
  isEnabled: number;
  order: number;
  createdAt: string;
}

export async function getBrowseCategories(userId: string): Promise<BrowseCategoryPreference[]> {
  const response = await fetch(withBase(`/api/browse-categories/${userId}`));
  if (!response.ok) throw new Error("Failed to get browse categories");
  return response.json();
}

export async function createBrowseCategory(userId: string, categoryType: string, categoryName: string, categorySlug: string, isEnabled: number = 1, order: number = 0): Promise<BrowseCategoryPreference> {
  const res = await apiRequest("POST", withBase("/api/browse-categories"), { userId, categoryType, categoryName, categorySlug, isEnabled, order });
  return res.json();
}

export async function updateBrowseCategory(id: string, updates: Partial<Omit<BrowseCategoryPreference, 'id' | 'userId' | 'createdAt'>>): Promise<BrowseCategoryPreference> {
  const res = await apiRequest("PATCH", withBase(`/api/browse-categories/${id}`), updates);
  return res.json();
}

export async function deleteBrowseCategory(id: string): Promise<void> {
  await apiRequest("DELETE", withBase(`/api/browse-categories/${id}`));
}

// Rating API
export async function updateBookRating(userBookId: string, rating: number): Promise<UserBook> {
  const res = await apiRequest("PATCH", withBase(`/api/user-books/${userBookId}/rating`), { rating });
  return res.json();
}

// Book Stats API
export async function getBookStats(bookId: string): Promise<BookStats | null> {
  const response = await fetch(withBase(`/api/book-stats/${bookId}`));
  if (!response.ok) return null;
  return response.json();
}
