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

export interface BookRecommendation extends BookSearchResult {
  rationale: string;
}

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  status: "reading" | "completed" | "on-hold" | "dropped" | "plan-to-read";
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

export async function ingestBook(book: Partial<BookSearchResult>): Promise<BookSearchResult> {
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
