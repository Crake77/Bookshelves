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

const GOOGLE_BOOKS_API_BASE = "https://www.googleapis.com/books/v1/volumes";

const DEMO_USER_BOOKS: UserBook[] = [
  {
    id: "demo-ub-1",
    userId: DEMO_USER_ID,
    bookId: "demo-book-1",
    status: "plan-to-read",
    rating: 92,
    addedAt: "2024-09-18T14:10:00.000Z",
    book: {
      googleBooksId: "demo-book-1",
      title: "Legends & Lattes",
      authors: ["Travis Baldree"],
      description:
        "A cosy fantasy about an orc warrior who retires from adventuring to open the first coffee shop in a city that has never tasted coffee.",
      coverUrl: "https://covers.openlibrary.org/b/id/12456984-L.jpg",
      publishedDate: "2022-02-22",
      pageCount: 304,
      categories: ["Fantasy", "Cozy"],
      isbn: "9781250886088",
    },
  },
  {
    id: "demo-ub-2",
    userId: DEMO_USER_ID,
    bookId: "demo-book-2",
    status: "plan-to-read",
    rating: null,
    addedAt: "2024-09-15T09:32:00.000Z",
    book: {
      googleBooksId: "demo-book-2",
      title: "Tomorrow, and Tomorrow, and Tomorrow",
      authors: ["Gabrielle Zevin"],
      description:
        "Two friends build a beloved video game and navigate fame, creativity, and complicated relationships across three decades.",
      coverUrl: "https://covers.openlibrary.org/b/id/13192829-L.jpg",
      publishedDate: "2022-07-05",
      pageCount: 416,
      categories: ["Fiction", "Literary"],
      isbn: "9780593321201",
    },
  },
  {
    id: "demo-ub-3",
    userId: DEMO_USER_ID,
    bookId: "demo-book-3",
    status: "completed",
    rating: 88,
    addedAt: "2024-08-28T19:05:00.000Z",
    book: {
      googleBooksId: "demo-book-3",
      title: "Project Hail Mary",
      authors: ["Andy Weir"],
      description:
        "A lone astronaut must save Earth from disaster in this gripping science fiction survival story from the author of The Martian.",
      coverUrl: "https://covers.openlibrary.org/b/id/12170465-L.jpg",
      publishedDate: "2021-05-04",
      pageCount: 496,
      categories: ["Science Fiction"],
      isbn: "9780593135204",
    },
  },
  {
    id: "demo-ub-4",
    userId: DEMO_USER_ID,
    bookId: "demo-book-4",
    status: "reading",
    rating: 75,
    addedAt: "2024-09-05T11:20:00.000Z",
    book: {
      googleBooksId: "demo-book-4",
      title: "Fourth Wing",
      authors: ["Rebecca Yarros"],
      description:
        "A deadly dragon rider war college tests Violet Sorrengail, who must rely on her wits and lightning bond to survive.",
      coverUrl: "https://covers.openlibrary.org/b/id/12901041-L.jpg",
      publishedDate: "2023-05-02",
      pageCount: 512,
      categories: ["Fantasy", "Romance"],
      isbn: "9781649374042",
    },
  },
  {
    id: "demo-ub-5",
    userId: DEMO_USER_ID,
    bookId: "demo-book-5",
    status: "on-hold",
    rating: null,
    addedAt: "2024-07-18T08:15:00.000Z",
    book: {
      googleBooksId: "demo-book-5",
      title: "A Study in Drowning",
      authors: ["Ava Reid"],
      description:
        "A dark academia fantasy steeped in folklore where a scholarship student uncovers secrets hidden within a decaying estate.",
      coverUrl: "https://covers.openlibrary.org/b/id/14622637-L.jpg",
      publishedDate: "2023-09-19",
      pageCount: 384,
      categories: ["Fantasy", "Mystery"],
      isbn: "9780063211506",
    },
  },
  {
    id: "demo-ub-6",
    userId: DEMO_USER_ID,
    bookId: "demo-book-6",
    status: "completed",
    rating: 95,
    addedAt: "2024-09-10T16:45:00.000Z",
    book: {
      googleBooksId: "demo-book-6",
      title: "The Invisible Life of Addie LaRue",
      authors: ["V. E. Schwab"],
      description:
        "Cursed to be forgotten by everyone she meets, Addie LaRue strikes a bargain that spans centuries and challenges the meaning of a life well lived.",
      coverUrl: "https://covers.openlibrary.org/b/id/10514838-L.jpg",
      publishedDate: "2020-10-06",
      pageCount: 448,
      categories: ["Fantasy", "Historical Fiction"],
      isbn: "9780765387561",
    },
  },
];

function cloneDemoBooks(status?: string): UserBook[] {
  const filtered = status
    ? DEMO_USER_BOOKS.filter((userBook) => userBook.status === status)
    : DEMO_USER_BOOKS;

  return filtered.map((userBook) => ({
    ...userBook,
    book: {
      ...userBook.book,
      authors: [...userBook.book.authors],
      categories: userBook.book.categories ? [...userBook.book.categories] : undefined,
    },
  }));
}

async function searchGoogleBooksFallback(query: string): Promise<BookSearchResult[]> {
  const response = await fetch(
    `${GOOGLE_BOOKS_API_BASE}?q=${encodeURIComponent(query)}&maxResults=20`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Google Books results");
  }

  const payload = (await response.json()) as {
    items?: Array<Record<string, any>>;
  };

  return (payload.items ?? []).map((item) => {
    const volume = item.volumeInfo ?? {};
    const imageLinks = volume.imageLinks ?? {};
    const coverUrl = imageLinks.thumbnail
      ? String(imageLinks.thumbnail).replace("http://", "https://")
      : undefined;
    const fallbackId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `google-${Math.random().toString(36).slice(2)}`;

    return {
      googleBooksId: String(item.id ?? volume.title ?? fallbackId),
      title: String(volume.title ?? "Untitled"),
      authors: Array.isArray(volume.authors) && volume.authors.length > 0
        ? volume.authors.map((author) => String(author))
        : ["Unknown Author"],
      description: volume.description ? String(volume.description) : undefined,
      coverUrl,
      publishedDate: volume.publishedDate ? String(volume.publishedDate) : undefined,
      pageCount: typeof volume.pageCount === "number" ? volume.pageCount : undefined,
      categories: Array.isArray(volume.categories)
        ? volume.categories.map((category) => String(category))
        : undefined,
      isbn: Array.isArray(volume.industryIdentifiers) && volume.industryIdentifiers.length > 0
        ? String(volume.industryIdentifiers[0]?.identifier ?? "")
        : undefined,
    } satisfies BookSearchResult;
  });
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Failed to search books: ${response.status}`);
    }
    const results = await response.json();
    if (Array.isArray(results)) {
      return results;
    }
    throw new Error("Malformed search response");
  } catch (error) {
    console.warn("[searchBooks] Falling back to Google Books API", error);
    return searchGoogleBooksFallback(query);
  }
}

export async function ingestBook(book: Partial<BookSearchResult>): Promise<IngestedBook> {
  const res = await apiRequest("POST", "/api/ingest", book);
  return res.json();
}

export async function getUserBooks(userId: string, status?: string): Promise<UserBook[]> {
  const url = status
    ? `/api/user-books/${userId}?status=${encodeURIComponent(status)}`
    : `/api/user-books/${userId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get user books: ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    console.warn("[getUserBooks] API returned empty array, using demo data");
    return cloneDemoBooks(status);
  } catch (error) {
    console.warn("[getUserBooks] Falling back to demo books", error);
    return cloneDemoBooks(status);
  }
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

// Rating API
export async function updateBookRating(userBookId: string, rating: number): Promise<UserBook> {
  const res = await apiRequest("PATCH", `/api/user-books/${userBookId}/rating`, { rating });
  return res.json();
}

// Book Stats API
export async function getBookStats(bookId: string): Promise<BookStats | null> {
  const response = await fetch(`/api/book-stats/${bookId}`);
  if (!response.ok) return null;
  return response.json();
}
