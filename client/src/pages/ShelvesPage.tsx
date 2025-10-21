import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import ShelfSection from "@/components/ShelfSection";
import BookCard from "@/components/BookCard";
import { lazy, Suspense } from "react";
const BookDetailDialog = lazy(() => import("@/components/BookDetailDialog"));
import { getUserBooks, DEMO_USER_ID, type UserBook, type BookSearchResult } from "@/lib/api";
import { useShelfPreferences } from "@/hooks/usePreferences";

export default function ShelvesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: userBooks = [], isLoading } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  const shelfPreferences = useShelfPreferences();
  const enabledShelves = shelfPreferences.filter((shelf) => shelf.isEnabled);

  // Filter books by search
  const filteredBooks = searchQuery
    ? userBooks.filter(ub => 
        ub.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ub.book.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : userBooks;

  // Create shelf sections with counts
  const shelves = enabledShelves.map((shelf) => ({
    name: shelf.name,
    slug: shelf.slug,
    count: userBooks.filter((ub) => ub.status === shelf.slug).length,
    books: filteredBooks.filter((ub) => ub.status === shelf.slug),
  }));

  return (
    <div className="pb-20">
      <AppHeader 
        title="Books" 
        subtitle={isLoading ? "Loading your library..." : `${userBooks.length} books in your library`}
      />
      
      <div className="px-4 py-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onFilterClick={() => console.log("Filter clicked")}
          placeholder="Filter by name"
        />
      </div>

      <div className="px-2">
        {shelves.map((shelf, index) => (
          <ShelfSection
            key={shelf.slug}
            title={shelf.name}
            count={shelf.count}
            defaultOpen={index === 0 || shelf.slug === "plan-to-read"}
          >
            {isLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="w-32 flex-shrink-0 animate-pulse">
                    <div className="w-full h-48 rounded-lg bg-muted" />
                    <div className="mt-2 h-4 bg-muted rounded" />
                    <div className="mt-1 h-3 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : shelf.books.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {shelf.books.map((userBook: UserBook) => (
                  <div 
                    key={userBook.id}
                    className="w-32 flex-shrink-0"
                  >
                      <BookCard
                      title={userBook.book.title}
                      author={userBook.book.authors[0]}
                      coverUrl={userBook.book.coverUrl}
                      status={userBook.status ?? undefined}
                      onClick={() => {
                        setSelectedBook(userBook.book);
                        setDialogOpen(true);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No books in this shelf
              </div>
            )}
          </ShelfSection>
        ))}
      </div>

      {dialogOpen && (
        <Suspense fallback={null}>
          <BookDetailDialog book={selectedBook} open={dialogOpen} onOpenChange={setDialogOpen} />
        </Suspense>
      )}
    </div>
  );
}
