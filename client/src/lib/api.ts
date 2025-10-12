import { apiRequest } from "./queryClient";

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
  addedAt: string;
  book: BookSearchResult;
}

// Demo user ID
export const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Failed to search books");
  return response.json();
}

export async function ingestBook(book: Partial<BookSearchResult>): Promise<IngestedBook> {
  const res = await apiRequest("POST", "/api/ingest", book);
  return res.json();
}

export async function getUserBooks(userId: string, status?: string): Promise<UserBook[]> {
  const url = status 
    ? `/api/user-books/${userId}?status=${status}`
    : `/api/user-books/${userId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to get user books");
  return response.json();
}

export async function addBookToShelf(
  userId: string, 
  bookId: string, 
  status: string
): Promise<UserBook> {
  const res = await apiRequest("POST", "/api/user-books", { userId, bookId, status });
  return res.json();
}

export async function updateBookStatus(userBookId: string, status: string): Promise<UserBook> {
  const res = await apiRequest("PATCH", `/api/user-books/${userBookId}`, { status });
  return res.json();
}

export async function removeBookFromShelf(userBookId: string): Promise<void> {
  await apiRequest("DELETE", `/api/user-books/${userBookId}`);
}

export async function getRecommendations(userId: string): Promise<BookRecommendation[]> {
  const response = await fetch(`/api/recs?userId=${userId}`);
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
  const response = await fetch(`/api/custom-shelves/${userId}`);
  if (!response.ok) throw new Error("Failed to get custom shelves");
  return response.json();
}

export async function createCustomShelf(userId: string, name: string, slug: string, isEnabled: number = 1, order: number = 0): Promise<CustomShelf> {
  const res = await apiRequest("POST", "/api/custom-shelves", { userId, name, slug, isEnabled, order });
  return res.json();
}

export async function updateCustomShelf(id: string, updates: Partial<Omit<CustomShelf, 'id' | 'userId' | 'createdAt'>>): Promise<CustomShelf> {
  const res = await apiRequest("PATCH", `/api/custom-shelves/${id}`, updates);
  return res.json();
}

export async function deleteCustomShelf(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/custom-shelves/${id}`);
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
  const response = await fetch(`/api/browse-categories/${userId}`);
  if (!response.ok) throw new Error("Failed to get browse categories");
  return response.json();
}

export async function createBrowseCategory(userId: string, categoryType: string, categoryName: string, categorySlug: string, isEnabled: number = 1, order: number = 0): Promise<BrowseCategoryPreference> {
  const res = await apiRequest("POST", "/api/browse-categories", { userId, categoryType, categoryName, categorySlug, isEnabled, order });
  return res.json();
}

export async function updateBrowseCategory(id: string, updates: Partial<Omit<BrowseCategoryPreference, 'id' | 'userId' | 'createdAt'>>): Promise<BrowseCategoryPreference> {
  const res = await apiRequest("PATCH", `/api/browse-categories/${id}`, updates);
  return res.json();
}

export async function deleteBrowseCategory(id: string): Promise<void> {
  await apiRequest("DELETE", `/api/browse-categories/${id}`);
}
