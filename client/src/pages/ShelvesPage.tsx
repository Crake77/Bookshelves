import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import ShelfSection from "@/components/ShelfSection";
import BookCard from "@/components/BookCard";
import { getUserBooks, DEMO_USER_ID } from "@/lib/api";

export default function ShelvesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: userBooks = [], isLoading } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  const shelvesByStatus = {
    reading: userBooks.filter(ub => ub.status === "reading"),
    completed: userBooks.filter(ub => ub.status === "completed"),
    "on-hold": userBooks.filter(ub => ub.status === "on-hold"),
    dropped: userBooks.filter(ub => ub.status === "dropped"),
    "plan-to-read": userBooks.filter(ub => ub.status === "plan-to-read"),
  };

  const filteredBooks = searchQuery
    ? userBooks.filter(ub => 
        ub.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ub.book.authors.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : userBooks;

  const filteredShelves = searchQuery
    ? {
        reading: filteredBooks.filter(ub => ub.status === "reading"),
        completed: filteredBooks.filter(ub => ub.status === "completed"),
        "on-hold": filteredBooks.filter(ub => ub.status === "on-hold"),
        dropped: filteredBooks.filter(ub => ub.status === "dropped"),
        "plan-to-read": filteredBooks.filter(ub => ub.status === "plan-to-read"),
      }
    : shelvesByStatus;

  const shelves = [
    { name: "Reading", key: "reading" as const, count: shelvesByStatus.reading.length },
    { name: "Completed", key: "completed" as const, count: shelvesByStatus.completed.length },
    { name: "On Hold", key: "on-hold" as const, count: shelvesByStatus["on-hold"].length },
    { name: "Dropped", key: "dropped" as const, count: shelvesByStatus.dropped.length },
    { name: "Plan to Read", key: "plan-to-read" as const, count: shelvesByStatus["plan-to-read"].length },
  ];

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
            key={shelf.key}
            title={shelf.name}
            count={shelf.count}
            defaultOpen={shelf.key === "plan-to-read"}
          >
            {filteredShelves[shelf.key].length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {filteredShelves[shelf.key].map((userBook) => (
                  <div 
                    key={userBook.id}
                    className="w-32 flex-shrink-0"
                  >
                    <BookCard
                      title={userBook.book.title}
                      author={userBook.book.authors[0]}
                      coverUrl={userBook.book.coverUrl}
                      status={userBook.status}
                      onClick={() => console.log(`Clicked ${userBook.book.title}`)}
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
    </div>
  );
}
