import { useMemo, useState } from "react";
import { useQuery, useQueries, type UseQueryResult } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import BookDetailDialog from "@/components/BookDetailDialog";
import SearchBar from "@/components/SearchBar";
import {
  searchBooks,
  getUserBooks,
  getBrowseCategories,
  getRecommendations,
  DEMO_USER_ID,
  type BookSearchResult,
} from "@/lib/api";
import type { BookRecommendation } from "@/lib/api";

type BrowseCategoryConfig = {
  categoryName: string;
  categorySlug: string;
  categoryType: "system" | "genre" | "custom";
};

const FALLBACK_BROWSE_CATEGORIES: BrowseCategoryConfig[] = [
  { categoryName: "Your Next Reads", categorySlug: "your-next-reads", categoryType: "system" },
  { categoryName: "New for You", categorySlug: "new-for-you", categoryType: "system" },
  { categoryName: "Fantasy", categorySlug: "fantasy", categoryType: "genre" },
  { categoryName: "Sci-Fi", categorySlug: "sci-fi", categoryType: "genre" },
  { categoryName: "Mystery", categorySlug: "mystery", categoryType: "genre" },
  { categoryName: "Romance", categorySlug: "romance", categoryType: "genre" },
];

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

  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useQuery<BookRecommendation[]>({
    queryKey: ["/api/recs", DEMO_USER_ID],
    queryFn: () => getRecommendations(DEMO_USER_ID),
  });

  const { data: browseCategoryPrefs = [], isLoading: isLoadingBrowseCategories } = useQuery({
    queryKey: ["/api/browse-categories", DEMO_USER_ID],
    queryFn: () => getBrowseCategories(DEMO_USER_ID),
  });

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  const nextReadsBooks = useMemo(
    () =>
      userBooks
        .filter((ub) => ub.status === "plan-to-read")
        .map((ub) => ub.book),
    [userBooks]
  );

  const recentlyAddedBooks = useMemo(
    () =>
      [...userBooks]
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
        .slice(0, 12)
        .map((ub) => ub.book),
    [userBooks]
  );

  const { books: newForYouBooks, isAi: hasAiRecommendations } = useMemo(() => {
    const aiBooks = recommendations.slice(0, 12);
    if (aiBooks.length > 0) {
      return { books: aiBooks, isAi: true };
    }
    return { books: recentlyAddedBooks, isAi: false };
  }, [recommendations, recentlyAddedBooks]);

  const browseCategories = useMemo<BrowseCategoryConfig[]>(() => {
    if (!browseCategoryPrefs || browseCategoryPrefs.length === 0) {
      return FALLBACK_BROWSE_CATEGORIES;
    }

    const enabled = browseCategoryPrefs
      .filter((category) => category.isEnabled !== 0)
      .sort((a, b) => a.order - b.order)
      .map<BrowseCategoryConfig>((category) => ({
        categoryName: category.categoryName,
        categorySlug: category.categorySlug,
        categoryType:
          (category.categoryType as BrowseCategoryConfig["categoryType"]) || "genre",
      }));

    return enabled.length > 0 ? enabled : FALLBACK_BROWSE_CATEGORIES;
  }, [browseCategoryPrefs]);

  const discoveryCategories = useMemo(
    () => browseCategories.filter((category) => category.categoryType !== "system"),
    [browseCategories]
  );

  const discoveryQueries = useQueries({
    queries: discoveryCategories.map((category) => ({
      queryKey: ["/api/browse-category", category.categorySlug],
      queryFn: async () => {
        const queryTerm =
          category.categoryType === "genre"
            ? category.categoryName
            : `${category.categoryName} books`;
        const results = await searchBooks(queryTerm);
        return results.slice(0, 12);
      },
      enabled: searchQuery.length <= 2 && category.categoryName.trim().length > 0,
      staleTime: 1000 * 60 * 30,
    })),
  }) as UseQueryResult<BookSearchResult[]>[];

  const discoveryQueryMap = useMemo(() => {
    const map = new Map<string, UseQueryResult<BookSearchResult[]>>();
    discoveryCategories.forEach((category, index) => {
      map.set(category.categorySlug, discoveryQueries[index]);
    });
    return map;
  }, [discoveryCategories, discoveryQueries]);

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
                  <p className="text-xs text-muted-foreground">
                    {book.authors?.[0] ?? "Unknown author"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No results found</div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {browseCategories.map((category) => {
            if (category.categoryType === "system") {
              if (category.categorySlug === "your-next-reads") {
                if (nextReadsBooks.length === 0) return null;

                return (
                  <HorizontalBookRow
                    key={category.categorySlug}
                    title={category.categoryName}
                    books={nextReadsBooks}
                    onBookClick={handleBookClick}
                    subtitle="Pulled from your Plan to Read shelf"
                  />
                );
              }

              if (category.categorySlug === "new-for-you") {
                const showRow = isLoadingRecommendations || newForYouBooks.length > 0;
                if (!showRow) return null;

                return (
                  <HorizontalBookRow
                    key={category.categorySlug}
                    title={category.categoryName}
                    books={newForYouBooks}
                    onBookClick={handleBookClick}
                    isLoading={isLoadingRecommendations}
                    subtitle={
                      hasAiRecommendations
                        ? "AI-powered picks based on your shelves"
                        : "Recently added to your library"
                    }
                  />
                );
              }

              return null;
            }

            const categoryQuery = discoveryQueryMap.get(category.categorySlug);
            const categoryBooks = categoryQuery?.data ?? [];
            const isLoadingCategory = Boolean(
              categoryQuery?.isLoading ||
              categoryQuery?.isFetching ||
              isLoadingBrowseCategories
            );

            if (!isLoadingCategory && categoryBooks.length === 0) {
              return null;
            }

            return (
              <HorizontalBookRow
                key={category.categorySlug}
                title={category.categoryName}
                books={categoryBooks}
                onBookClick={handleBookClick}
                isLoading={isLoadingCategory}
              />
            );
          })}
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
