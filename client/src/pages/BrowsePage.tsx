import { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import SafeBookDialog from "@/components/SafeBookDialog";
import SearchBar from "@/components/SearchBar";
import {
  searchBooks,
  fetchBrowseBooks,
  DEMO_USER_ID,
  type BookSearchResult,
  type BrowseAlgo,
} from "@/lib/api";
import { consumePendingBrowseFilter, type BrowseFilter } from "@/lib/browseFilter";
import { getFallbackBrowse } from "@/lib/browseFallback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoryPreferences } from "@/hooks/usePreferences";

const CAROUSEL_PAGE_SIZE = 12;
const RANKING_STORAGE_KEY = "bookshelves:browse-ranking";

interface UseBrowseCarouselArgs {
  algo: BrowseAlgo;
  userId?: string;
  genre?: string | null;
  subgenre?: string | null;
  tag?: string | null;
}

function useBrowseCarousel({ algo, userId, genre, subgenre, tag }: UseBrowseCarouselArgs) {
  const fallbackBooks = useMemo(
    () => getFallbackBrowse(algo, genre ?? undefined),
    [algo, genre]
  );
  const fallbackInfiniteData = useMemo<InfiniteData<BookSearchResult[], number>>(() => {
    return {
      pages: [fallbackBooks],
      pageParams: [0],
    };
  }, [fallbackBooks]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    status,
    error,
  } = useInfiniteQuery({
    queryKey: ["browse", algo, genre ?? "all", subgenre ?? "", tag ?? "", userId ?? "anon"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0, signal }) =>
      fetchBrowseBooks({
        algo,
        userId,
        genre: genre ?? undefined,
        subgenre: subgenre ?? undefined,
        tag: tag ?? undefined,
        limit: CAROUSEL_PAGE_SIZE,
        offset: pageParam,
        signal,
      }),
    // Offset-based pagination: advance by the fixed page size when a full page is returned.
    // If the API returns fewer than the page size, treat as the end.
    getNextPageParam: (
      lastPage: BookSearchResult[],
      _pages: BookSearchResult[][],
      lastPageParam: number
    ) => (Array.isArray(lastPage) && lastPage.length === CAROUSEL_PAGE_SIZE
      ? lastPageParam + CAROUSEL_PAGE_SIZE
      : undefined),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData ?? fallbackInfiniteData,
  });

  const rawBooks = useMemo(() => (data?.pages ?? []).flat(), [data]);
  const hasRealData = status === "success" && rawBooks.length > 0;
  const displayBooks = hasRealData ? rawBooks : fallbackBooks;
  const errorMessage =
    status === "error"
      ? error instanceof Error
        ? error.message
        : "Failed to load recommendations"
      : null;
  const isInitialLoadInFlight =
    isLoading || (isFetching && !hasRealData);
  const resolvedHasNextPage = hasNextPage ?? (!hasRealData && displayBooks.length > 0);

  return {
    books: displayBooks,
    offset: displayBooks.length,
    isLoading: isInitialLoadInFlight,
    hasMore: resolvedHasNextPage,
    error: errorMessage,
    loadMore: resolvedHasNextPage ? () => fetchNextPage() : undefined,
    isLoadingMore: isFetchingNextPage,
  };
}

const RANKING_OPTIONS: Array<{ value: BrowseAlgo; label: string }> = [
  { value: "popular", label: "Most Popular" },
  { value: "rating", label: "Highest User Rating" },
  { value: "recent", label: "Recently Added" },
  { value: "for-you", label: "For You" },
];

function isBrowseAlgo(value: string | null): value is BrowseAlgo {
  return value === "popular" || value === "rating" || value === "recent" || value === "for-you";
}

const CATEGORY_GENRE_MAP: Record<string, string> = {
  fantasy: "Fantasy",
  "sci-fi": "Science Fiction",
  "science-fiction": "Science Fiction",
  mystery: "Mystery",
  romance: "Romance",
};

interface CategoryConfig {
  key: string;
  title: string;
  algo: BrowseAlgo;
  genre?: string | null;
  emptyMessage?: string;
}

interface CategoryCarouselProps {
  config: CategoryConfig;
  onBookClick: (book: BookSearchResult) => void;
}

function CategoryCarousel({ config, onBookClick }: CategoryCarouselProps) {
  const carousel = useBrowseCarousel({
    algo: config.algo,
    userId: DEMO_USER_ID,
    genre: config.genre ?? undefined,
  });

  const initialLoading = carousel.books.length === 0 && carousel.isLoading;
  const loadingMore = carousel.isLoading && carousel.books.length > 0;

  return (
    <HorizontalBookRow
      title={config.title}
      books={carousel.books}
      onBookClick={onBookClick}
      onEndReached={
        carousel.hasMore && carousel.loadMore
          ? () => {
              void carousel.loadMore?.();
            }
          : undefined
      }
      isInitialLoading={initialLoading}
      isLoadingMore={loadingMore}
      hasMore={carousel.hasMore}
      errorMessage={carousel.error}
      emptyMessage={config.emptyMessage}
    />
  );
}

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ranking, setRanking] = useState<BrowseAlgo>("popular");
  const [pendingFilter, setPendingFilter] = useState<BrowseFilter | null>(null);
  const categoryPreferences = useCategoryPreferences();
  const enabledCategories = useMemo(
    () => categoryPreferences.filter((category) => category.isEnabled),
    [categoryPreferences]
  );

  const categoryConfigs = useMemo<CategoryConfig[]>(() => {
    return enabledCategories.map((category, index) => {
      let algo: BrowseAlgo = "popular";
      let genre: string | null | undefined = null;
      let emptyMessage: string | undefined;

      if (category.categoryType === "system") {
        if (category.slug === "your-next-reads") {
          algo = "for-you";
          emptyMessage =
            "Add a few books to your shelves or rate recent reads to unlock personalized picks.";
        } else if (category.slug === "new-for-you") {
          algo = "recent";
        } else {
          algo = "popular";
        }
      } else {
        const mappedGenre = CATEGORY_GENRE_MAP[category.slug] ?? category.name;
        genre = mappedGenre;
      }

      return {
        key: `${category.slug}-${index}`,
        title: category.name,
        algo,
        genre,
        emptyMessage,
      } satisfies CategoryConfig;
    });
  }, [enabledCategories]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(RANKING_STORAGE_KEY);
    if (stored && isBrowseAlgo(stored)) {
      setRanking(stored);
    }
    // Consume any pending filter handoff from chips
    const pf = consumePendingBrowseFilter();
    if (pf) setPendingFilter(pf);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RANKING_STORAGE_KEY, ranking);
  }, [ranking]);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => searchBooks(searchQuery),
    enabled: searchQuery.length > 2,
  });

  const handleBookClick = (book: BookSearchResult) => {
    setSelectedBook(book);
    setDialogOpen(true);
  };

  const featuredCarousel = useBrowseCarousel({ algo: ranking, userId: DEMO_USER_ID });

  const rankingOption = RANKING_OPTIONS.find((option) => option.value === ranking) ?? RANKING_OPTIONS[0];

  const featuredInitialLoading = featuredCarousel.books.length === 0 && featuredCarousel.isLoading;
  const featuredLoadingMore = featuredCarousel.isLoading && featuredCarousel.books.length > 0;

  return (
    <div className="pb-20">
      <AppHeader title="Discover" />

      <div className="px-4 pt-4 space-y-3">
        <div className="flex justify-end">
          <Select value={ranking} onValueChange={(value) => setRanking(value as BrowseAlgo)}>
            <SelectTrigger
              className="w-48 justify-between"
              data-testid="browse-ranking-toggle"
              aria-label="Browse ranking toggle"
            >
              <SelectValue placeholder="Select ranking" />
            </SelectTrigger>
            <SelectContent align="end">
              {RANKING_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  data-testid={`browse-ranking-${option.value}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search for books..." />
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
        <div className="space-y-6 pt-4">
          {pendingFilter && (
            <FilteredCarousel filter={pendingFilter} ranking={ranking} onBookClick={handleBookClick} />
          )}
          {featuredCarousel.error && (
            <div className="px-4 text-sm text-destructive">
              We couldn&apos;t load recommendations right now. Please try again in a moment.
            </div>
          )}

          <HorizontalBookRow
            title={rankingOption.label}
            books={featuredCarousel.books}
            onBookClick={handleBookClick}
            onEndReached={
              featuredCarousel.hasMore && featuredCarousel.loadMore
                ? () => {
                    void featuredCarousel.loadMore?.();
                  }
                : undefined
            }
            isInitialLoading={featuredInitialLoading}
            isLoadingMore={featuredLoadingMore}
            hasMore={featuredCarousel.hasMore}
            errorMessage={featuredCarousel.error}
            emptyMessage={
              ranking === "for-you"
                ? "Add a few books to your shelves or rate recent reads to unlock personalized picks."
                : undefined
            }
          />

          {categoryConfigs.map((config) => (
            <CategoryCarousel key={config.key} config={config} onBookClick={handleBookClick} />
          ))}
        </div>
      )}

      <SafeBookDialog book={selectedBook} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

interface FilteredCarouselProps {
  filter: BrowseFilter;
  ranking: BrowseAlgo;
  onBookClick: (book: BookSearchResult) => void;
}

function FilteredCarousel({ filter, ranking, onBookClick }: FilteredCarouselProps) {
  const args: UseBrowseCarouselArgs = { algo: ranking, userId: DEMO_USER_ID };
  let title = "Filtered";
  if (filter.kind === "genre") {
    (args as any).genre = filter.label;
    title = filter.label;
  } else if (filter.kind === "subgenre") {
    (args as any).genre = undefined;
    (args as any).subgenre = filter.slug;
    title = filter.label;
  } else if (filter.kind === "tag") {
    (args as any).tag = filter.slug;
    title = `#${filter.label}`;
  }

  const carousel = useBrowseCarousel(args);

  const initialLoading = carousel.books.length === 0 && carousel.isLoading;
  const loadingMore = carousel.isLoading && carousel.books.length > 0;

  return (
    <HorizontalBookRow
      title={title}
      books={carousel.books}
      onBookClick={onBookClick}
      onEndReached={
        carousel.hasMore && carousel.loadMore ? () => void carousel.loadMore?.() : undefined
      }
      isInitialLoading={initialLoading}
      isLoadingMore={loadingMore}
      hasMore={carousel.hasMore}
      errorMessage={carousel.error}
    />
  );
}
