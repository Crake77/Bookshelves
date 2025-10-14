import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import BookDetailDialog from "@/components/BookDetailDialog";
import SearchBar from "@/components/SearchBar";
import {
  Api,
  mapOpenLibraryBook,
  getUserBooks,
  DEMO_USER_ID,
  type BookSearchResult,
  type OpenLibraryBook,
} from "@/lib/api";

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; title: string; items: OpenLibraryBook[] }>>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [results, setResults] = useState<BookSearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const { data: userBooks = [] } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };
  const nextReadsBooks = useMemo(
    () => userBooks.filter(ub => ub.status === "plan-to-read").map(ub => ub.book),
    [userBooks]
  );

  const newForYouBooks = useMemo(
    () =>
      [...userBooks]
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
        .slice(0, 10)
        .map(ub => ub.book),
    [userBooks]
  );

  useEffect(() => {
    Api.browseRows()
      .then((data) => setRows(data.rows))
      .catch((error: unknown) => setRowsError(String(error)))
      .finally(() => setRowsLoading(false));
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length <= 2) {
      setResults(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    Api.search(searchQuery.trim(), 1)
      .then(({ items }) => {
        if (!cancelled) {
          setResults(items.map(mapOpenLibraryBook));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSearchError(String(error));
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const browseRows = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        books: row.items.map(mapOpenLibraryBook),
      })),
    [rows]
  );

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
          {searchLoading ? (
            <div className="text-center text-muted-foreground py-8">Searching...</div>
          ) : searchError ? (
            <div className="text-center text-destructive py-8 text-sm">{searchError}</div>
          ) : results && results.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {results.slice(0, 10).map((book) => (
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

          {/* Browse Rows */}
          {rowsLoading ? (
            <div className="px-4 space-y-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-4 w-40 bg-muted rounded" />
                  <div className="flex gap-3">
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j} className="w-32 h-48 bg-muted rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : rowsError ? (
            <div className="px-4 text-destructive text-sm">{rowsError}</div>
          ) : (
            browseRows.map((row) => (
              <HorizontalBookRow
                key={row.id}
                title={row.title}
                books={row.books}
                onBookClick={handleBookClick}
              />
            ))
          )}
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
