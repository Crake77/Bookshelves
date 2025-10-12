import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import BookDetailDialog from "@/components/BookDetailDialog";
import SearchBar from "@/components/SearchBar";
import { searchBooks, getUserBooks, DEMO_USER_ID, type BookSearchResult } from "@/lib/api";

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

  // Get genre-specific books
  const getBooksByGenre = async (genre: string): Promise<BookSearchResult[]> => {
    try {
      const results = await searchBooks(genre);
      return results.slice(0, 10);
    } catch {
      return [];
    }
  };

  const [fantasyBooks, setFantasyBooks] = useState<BookSearchResult[]>([]);
  const [sciFiBooks, setSciFiBooks] = useState<BookSearchResult[]>([]);
  const [mysteryBooks, setMysteryBooks] = useState<BookSearchResult[]>([]);
  const [romanceBooks, setRomanceBooks] = useState<BookSearchResult[]>([]);

  useEffect(() => {
    // Load genre books on mount
    getBooksByGenre("Fantasy").then(setFantasyBooks);
    getBooksByGenre("Science Fiction").then(setSciFiBooks);
    getBooksByGenre("Mystery").then(setMysteryBooks);
    getBooksByGenre("Romance").then(setRomanceBooks);
  }, []);

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
            books={fantasyBooks}
            onBookClick={handleBookClick}
          />

          {/* Science Fiction */}
          <HorizontalBookRow
            title="Sci-Fi"
            books={sciFiBooks}
            onBookClick={handleBookClick}
          />

          {/* Mystery */}
          <HorizontalBookRow
            title="Mystery"
            books={mysteryBooks}
            onBookClick={handleBookClick}
          />

          {/* Romance */}
          <HorizontalBookRow
            title="Romance"
            books={romanceBooks}
            onBookClick={handleBookClick}
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
