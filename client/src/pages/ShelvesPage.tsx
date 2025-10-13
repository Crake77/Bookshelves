import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import ShelfSection from "@/components/ShelfSection";
import BookCard from "@/components/BookCard";
import BookDetailDialog from "@/components/BookDetailDialog";
import { Api, type BookSearchResult } from "@/lib/api";

const DEFAULT_SECTIONS = [
  "Popular in Fantasy",
  "Trending in Sci-Fi",
  "Mystery & Thrillers",
  "Historical Fiction",
  "Romance Picks",
];

type BrowseRow = {
  id: string;
  title: string;
  items: BookSearchResult[];
};

export default function ShelvesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Api.browseRows()
      .then((data) => setRows(data.rows))
      .catch((err) => {
        setError(String(err));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const allBooks = useMemo(() => {
    const map = new Map<string, BookSearchResult>();
    rows.forEach((row) => {
      row.items.forEach((book) => {
        if (book.id && !map.has(book.id)) {
          map.set(book.id, book);
        }
      });
    });
    return Array.from(map.values());
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return rows;
    }

    const lower = searchQuery.toLowerCase();
    return rows
      .map((row) => ({
        ...row,
        items: row.items.filter((book) => {
          const title = book.title?.toLowerCase() ?? "";
          const author = book.author?.toLowerCase() ?? "";
          return title.includes(lower) || author.includes(lower);
        }),
      }))
      .filter((row) => row.items.length > 0);
  }, [rows, searchQuery]);

  const sectionsToRender = filteredRows.length > 0 ? filteredRows : rows.length > 0 ? rows : DEFAULT_SECTIONS.map((title, index) => ({
    id: `placeholder-${index}`,
    title,
    items: [],
  }));

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  return (
    <div className="pb-20">
      <AppHeader
        title="Books"
        subtitle={
          loading
            ? "Loading recommendations..."
            : `${allBooks.length} books discovered for you`
        }
      />

      <div className="px-4 py-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Filter by title or author"
        />
      </div>

      {error && !loading && (
        <div className="px-4 text-destructive text-sm">{error}</div>
      )}

      <div className="px-2">
        {sectionsToRender.map((section, index) => (
          <ShelfSection
            key={section.id}
            title={section.title}
            count={section.items.length}
            defaultOpen={index === 0}
          >
            {loading ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                Loading books...
              </div>
            ) : section.items.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {section.items.map((book) => (
                  <div key={book.id} className="w-32 flex-shrink-0">
                    <BookCard
                      title={book.title ?? "Untitled"}
                      author={book.author ?? "Unknown author"}
                      coverUrl={book.cover ?? undefined}
                      onClick={() => handleBookClick(book)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No books in this shelf yet.
              </div>
            )}
          </ShelfSection>
        ))}
      </div>

      <BookDetailDialog book={selectedBook} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
