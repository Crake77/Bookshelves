import { useState, useEffect, useReducer, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import BookDetailDialog from "@/components/BookDetailDialog";
import SearchBar from "@/components/SearchBar";
import { searchBooks, getUserBooks, DEMO_USER_ID, type BookSearchResult } from "@/lib/api";

const GENRE_BATCH_SIZE = 20;
const MIN_GENRE_APPEND = 12;
const MAX_GENRE_REQUESTS = 6;
const MAX_GENRE_PAGES = 40; // up to 800 results per genre
const MAX_START_INDEX = MAX_GENRE_PAGES * GENRE_BATCH_SIZE;

interface GenreState {
  books: BookSearchResult[];
  loadCount: number;
  isLoading: boolean;
  hasMore: boolean;
}

type GenreAction =
  | { type: "REQUEST" }
  | { type: "SUCCESS"; books: BookSearchResult[]; hasMore: boolean }
  | { type: "RESET" }
  | { type: "FAIL" };

const initialGenreState: GenreState = {
  books: [],
  loadCount: 0,
  isLoading: false,
  hasMore: true,
};

function genreReducer(state: GenreState, action: GenreAction): GenreState {
  switch (action.type) {
    case "REQUEST":
      return { ...state, isLoading: true };
    case "SUCCESS": {
      const incoming = action.books ?? [];
      const nextBooks =
        incoming.length > 0 ? [...state.books, ...incoming] : state.books;
      return {
        books: nextBooks,
        loadCount: state.loadCount + 1,
        isLoading: false,
        hasMore: action.hasMore,
      };
    }
    case "RESET":
      return initialGenreState;
    case "FAIL":
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

function useGenreCarousel(query: string) {
  const [state, dispatch] = useReducer(genreReducer, initialGenreState);
  const stateRef = useRef(state);
  const seenIdsRef = useRef(new Set<string>());
  const nextStartIndexRef = useRef(0);

  const hasUnusedStartIndices = useCallback(() => {
    return nextStartIndexRef.current < MAX_START_INDEX;
  }, []);

  const getNextStartIndex = useCallback((): number | null => {
    if (nextStartIndexRef.current >= MAX_START_INDEX) {
      return null;
    }
    const next = nextStartIndexRef.current;
    nextStartIndexRef.current += GENRE_BATCH_SIZE;
    return next;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    seenIdsRef.current = new Set<string>();
    nextStartIndexRef.current = 0;
  }, [query]);

  const loadMore = useCallback(
    async (): Promise<void> => {
      const snapshot = stateRef.current;
      if (snapshot.isLoading || !snapshot.hasMore) {
        return;
      }

      dispatch({ type: "REQUEST" });

      try {
        const seenIds = seenIdsRef.current;
        const freshBooks: BookSearchResult[] = [];
        let hasMore = true;
        let requests = 0;

        while (
          freshBooks.length < MIN_GENRE_APPEND &&
          requests < MAX_GENRE_REQUESTS &&
          hasMore
        ) {
          const startIndex = getNextStartIndex();
          if (startIndex === null) {
            hasMore = false;
            break;
          }

          const results = await searchBooks(query, { startIndex });
          requests += 1;

          if (!Array.isArray(results) || results.length === 0) {
            continue;
          }

          const unique = results.filter((book) => {
            const id = book.googleBooksId;
            if (!id || seenIds.has(id)) {
              return false;
            }
            seenIds.add(id);
            return true;
          });

          freshBooks.push(...unique);

          if (results.length < GENRE_BATCH_SIZE) {
            hasMore = false;
          }
        }

        const moreAvailable = hasUnusedStartIndices();
        const finalHasMore = hasMore && moreAvailable && freshBooks.length > 0;

        if (freshBooks.length === 0) {
          dispatch({
            type: "SUCCESS",
            books: [],
            hasMore: false,
          });
          return;
        }

        dispatch({
          type: "SUCCESS",
          books: freshBooks,
          hasMore: finalHasMore,
        });
      } catch (error) {
        console.error(`[BrowsePage] Failed to load ${query} books`, error);
        dispatch({ type: "FAIL" });
      }
    },
    [getNextStartIndex, hasUnusedStartIndices, query]
  );

  useEffect(() => {
    const current = stateRef.current;
    if (current.loadCount === 0 && current.books.length === 0 && !current.isLoading) {
      void loadMore();
    }
  }, [loadMore]);

  return { ...state, loadMore };
}

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => searchBooks(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const { data: userBooks = [] } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  // Get categories from user's books
  const getCategories = () => {
    const allCategories = new Set<string>();
    userBooks.forEach(ub => {
      ub.book.categories?.forEach(cat => allCategories.add(cat));
    });
    return Array.from(allCategories);
  };

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  // Get books for "Your Next Reads" (plan-to-read status)
  const nextReadsBooks = userBooks
    .filter(ub => ub.status === "plan-to-read")
    .map(ub => ub.book);

  // Get books for "New for You" (recently added)
  const newForYouBooks = userBooks
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 10)
    .map(ub => ub.book);

  const fantasyCarousel = useGenreCarousel("Fantasy");
  const sciFiCarousel = useGenreCarousel("Science Fiction");
  const mysteryCarousel = useGenreCarousel("Mystery");
  const romanceCarousel = useGenreCarousel("Romance");

  return (
    <div className="pb-20">
      <AppHeader title="Discover" />
      
      <div className="px-4 py-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search for books..."
        />
      </div>

      {searchQuery.length > 2 ? (
        <div className="px-4 py-4">
          <h2 className="font-display text-lg font-semibold mb-3">Search Results</h2>
          {isSearching ? (
            <div className="text-center text-muted-foreground py-8">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.slice(0, 10).map((book) => (
                <div 
                  key={book.googleBooksId} 
                  className="cursor-pointer"
                  onClick={() => handleBookClick(book)}
                  data-testid={`search-result-${book.googleBooksId}`}
                >
                  <img
                    src={book.coverUrl || "/placeholder-book.png"}
                    alt={book.title}
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                  <h3 className="font-medium text-sm line-clamp-2">{book.title}</h3>
                  <p className="text-xs text-muted-foreground">{book.authors[0]}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No results found</div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Your Next Reads */}
          {nextReadsBooks.length > 0 && (
            <HorizontalBookRow
              title="Your Next Reads"
              books={nextReadsBooks}
              onBookClick={handleBookClick}
            />
          )}

          {/* New for You */}
          {newForYouBooks.length > 0 && (
            <HorizontalBookRow
              title="New for You"
              books={newForYouBooks}
              onBookClick={handleBookClick}
            />
          )}

          {/* Fantasy */}
          <HorizontalBookRow
            title="Fantasy"
            books={fantasyCarousel.books}
            onBookClick={handleBookClick}
            onEndReached={
              fantasyCarousel.hasMore
                ? () => {
                    void fantasyCarousel.loadMore();
                  }
                : undefined
            }
            isLoadingMore={fantasyCarousel.isLoading}
            hasMore={fantasyCarousel.hasMore}
          />

          {/* Science Fiction */}
          <HorizontalBookRow
            title="Sci-Fi"
            books={sciFiCarousel.books}
            onBookClick={handleBookClick}
            onEndReached={
              sciFiCarousel.hasMore
                ? () => {
                    void sciFiCarousel.loadMore();
                  }
                : undefined
            }
            isLoadingMore={sciFiCarousel.isLoading}
            hasMore={sciFiCarousel.hasMore}
          />

          {/* Mystery */}
          <HorizontalBookRow
            title="Mystery"
            books={mysteryCarousel.books}
            onBookClick={handleBookClick}
            onEndReached={
              mysteryCarousel.hasMore
                ? () => {
                    void mysteryCarousel.loadMore();
                  }
                : undefined
            }
            isLoadingMore={mysteryCarousel.isLoading}
            hasMore={mysteryCarousel.hasMore}
          />

          {/* Romance */}
          <HorizontalBookRow
            title="Romance"
            books={romanceCarousel.books}
            onBookClick={handleBookClick}
            onEndReached={
              romanceCarousel.hasMore
                ? () => {
                    void romanceCarousel.loadMore();
                  }
                : undefined
            }
            isLoadingMore={romanceCarousel.isLoading}
            hasMore={romanceCarousel.hasMore}
          />
        </div>
      )}

      <BookDetailDialog
        book={selectedBook}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
