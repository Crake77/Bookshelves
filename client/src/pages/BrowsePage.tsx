import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import BookDetailDialog from "@/components/BookDetailDialog";
import SearchBar from "@/components/SearchBar";
import { Api, type BookSearchResult } from "@/lib/api";

const SKELETON_ROWS = [
  { id: "fantasy", title: "Popular in Fantasy" },
  { id: "science_fiction", title: "Trending in Sci-Fi" },
  { id: "mystery", title: "Mystery & Thrillers" },
  { id: "historical_fiction", title: "Historical Fiction" },
  { id: "romance", title: "Romance Picks" },
];

type BrowseRow = {
  id: string;
  title: string;
  items: BookSearchResult[];
};

export default function BrowsePage() {
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setRowsLoading(true);
    setRowsError(null);
    Api.browseRows()
      .then((data) => {
        setRows(data.rows);
      })
      .catch((error) => {
        setRowsError(String(error));
        setRows([]);
      })
      .finally(() => {
        setRowsLoading(false);
      });
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3) {
      setSearchResults(null);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    Api.search(trimmed, 1)
      .then(({ items }) => {
        if (!cancelled) {
          setSearchResults(items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSearchError(String(error));
          setSearchResults([]);
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

  const visibleRows = useMemo(() => {
    if (rowsLoading && rows.length === 0) {
      return SKELETON_ROWS.map((row) => ({ ...row, items: [] as BookSearchResult[] }));
    }
    return rows;
  }, [rows, rowsLoading]);

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  const renderSearchResults = () => {
    if (!searchResults || searchResults.length === 0) {
      if (searchLoading) {
        return <div className="text-center text-muted-foreground py-8">Searching...</div>;
      }

      if (searchError) {
        return (
          <div className="text-center text-destructive py-8">
            Unable to load search results. Please try again.
          </div>
        );
      }

      if (searchQuery.trim().length < 3) {
        return (
          <div className="text-center text-muted-foreground py-8">
            Start typing to search the Open Library catalog.
          </div>
        );
      }

      return <div className="text-center text-muted-foreground py-8">No results found.</div>;
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {searchResults.map((book) => (
          <div
            key={book.id}
            className="cursor-pointer"
            onClick={() => handleBookClick(book)}
            data-testid={`search-result-${book.id.replace(/\W+/g, "-")}`}
          >
            <img
              src={book.cover || "/placeholder-book.png"}
              alt={book.title ?? "Untitled"}
              className="w-full h-48 object-cover rounded-lg mb-2"
            />
            <h3 className="font-medium text-sm line-clamp-2">{book.title ?? "Untitled"}</h3>
            <p className="text-xs text-muted-foreground">{book.author ?? "Unknown author"}</p>
          </div>
        ))}
      </div>
    );
  };

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

      {searchQuery.trim().length >= 3 ? (
        <div className="px-4 py-4">
          <h2 className="font-display text-lg font-semibold mb-3">Search Results</h2>
          {renderSearchResults()}
        </div>
      ) : (
        <div className="space-y-8">
          {rowsError && !rowsLoading && (
            <div className="px-4 text-destructive text-sm">
              {rowsError}
            </div>
          )}

          {visibleRows.map((row) => (
            <HorizontalBookRow
              key={row.id}
              title={row.title}
              books={row.items}
              onBookClick={handleBookClick}
              isLoading={rowsLoading}
            />
          ))}
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
