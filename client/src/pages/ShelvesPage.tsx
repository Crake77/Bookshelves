import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import ShelfSection from "@/components/ShelfSection";
import BookCard from "@/components/BookCard";
import BookDetailDialog from "@/components/BookDetailDialog";
import { getUserBooks, getCustomShelves, DEMO_USER_ID, type UserBook, type BookSearchResult } from "@/lib/api";

export default function ShelvesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: userBooks = [], isLoading } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ["/api/custom-shelves", DEMO_USER_ID],
    queryFn: () => getCustomShelves(DEMO_USER_ID),
  });

  // Build complete shelves list (default + enabled custom)
  const defaultShelves = [
    { name: "Reading", slug: "reading" },
    { name: "Completed", slug: "completed" },
    { name: "On Hold", slug: "on-hold" },
    { name: "Dropped", slug: "dropped" },
    { name: "Plan to Read", slug: "plan-to-read" },
  ];

  const allShelves = [
    ...defaultShelves,
    ...customShelves
      .filter(shelf => shelf.isEnabled === 1)
      .map(shelf => ({
        name: shelf.name,
        slug: shelf.slug,
      }))
  ];

  // Filter books by search
  const filteredBooks = searchQuery
    ? userBooks.filter(ub => 
        ub.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ub.book.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : userBooks;

  // Create shelf sections with counts
  const shelves = allShelves.map(shelf => ({
    name: shelf.name,
    slug: shelf.slug,
    count: userBooks.filter(ub => ub.status === shelf.slug).length,
    books: filteredBooks.filter(ub => ub.status === shelf.slug),
  }));

  if (isLoading) {
    return (
      <div className="pb-20">
        <AppHeader title="Books" subtitle="Loading your library..." />
        <div className="px-4 py-8 text-center text-muted-foreground">
          Loading your books...
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <AppHeader 
        title="Books" 
        subtitle={`${userBooks.length} books in your library`}
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
        {shelves.map((shelf) => (
          <ShelfSection
            key={shelf.slug}
            title={shelf.name}
            count={shelf.count}
            defaultOpen={shelf.slug === "plan-to-read"}
          >
            {shelf.books.length > 0 ? (
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
                      status={userBook.status}
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

      <BookDetailDialog
        book={selectedBook}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
