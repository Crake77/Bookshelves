import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import BookCard from "@/components/BookCard";
import BookDetailDialog from "@/components/BookDetailDialog";
import GenreCard from "@/components/GenreCard";
import RecommendationCard from "@/components/RecommendationCard";
import SearchBar from "@/components/SearchBar";
import { ChevronRight } from "lucide-react";
import { searchBooks, getRecommendations, DEMO_USER_ID, type BookSearchResult } from "@/lib/api";

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => searchBooks(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/recs", DEMO_USER_ID],
    queryFn: () => getRecommendations(DEMO_USER_ID),
  });

  const upcomingBooks: BookSearchResult[] = []; // Can be populated from a specific API or data source

  const genres = [
    { name: "Fantasy", count: 42, color: "250 70% 60%" },
    { name: "Science Fiction", count: 28, color: "210 80% 55%" },
    { name: "Mystery", count: 15, color: "140 60% 50%" },
    { name: "Romance", count: 12, color: "340 70% 60%" },
  ];

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
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

      {searchQuery.length > 2 && (
        <div className="px-4 py-4">
          <h2 className="font-display text-lg font-semibold mb-3">Search Results</h2>
          {isSearching ? (
            <div className="text-center text-muted-foreground py-8">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.slice(0, 10).map((book) => (
                <BookCard
                  key={book.googleBooksId}
                  title={book.title}
                  author={book.authors[0]}
                  coverUrl={book.coverUrl}
                  onClick={() => handleBookClick(book)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No results found</div>
          )}
        </div>
      )}

      {!searchQuery && (
        <div className="px-4 py-4 space-y-6">
          {upcomingBooks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold">Upcoming Releases</h2>
                <button className="text-sm text-primary flex items-center gap-1 hover-elevate px-2 py-1 rounded">
                  See All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {upcomingBooks.map((book) => (
                  <div key={book.googleBooksId} className="w-32 flex-shrink-0">
                    <BookCard
                      title={book.title}
                      author={book.authors[0]}
                      coverUrl={book.coverUrl}
                      onClick={() => console.log(`Clicked ${book.title}`)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Browse by Genre</h2>
              <button className="text-sm text-primary flex items-center gap-1 hover-elevate px-2 py-1 rounded">
                See All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {genres.map((genre) => (
                <GenreCard
                  key={genre.name}
                  genre={genre.name}
                  bookCount={genre.count}
                  color={genre.color}
                  onClick={() => console.log(`Clicked ${genre.name}`)}
                />
              ))}
            </div>
          </section>

          {recommendations.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-semibold">AI Recommended</h2>
              </div>
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec) => (
                  <RecommendationCard
                    key={rec.googleBooksId}
                    title={rec.title}
                    author={rec.authors[0]}
                    coverUrl={rec.coverUrl}
                    rationale={rec.rationale}
                    onClick={() => handleBookClick(rec)}
                  />
                ))}
              </div>
            </section>
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
