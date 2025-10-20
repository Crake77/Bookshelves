import { useState, useEffect, useMemo } from "react";
import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import HorizontalBookRow from "@/components/HorizontalBookRow";
import { lazy, Suspense } from "react";
const BookDetailDialog = lazy(() => import("@/components/BookDetailDialog"));
import SearchBar from "@/components/SearchBar";
import BookCard from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { loadCategoryPreferences, saveCategoryPreferences } from "@/lib/preferences";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CAROUSEL_PAGE_SIZE = 12;
const RANKING_STORAGE_KEY = "bookshelves:browse-ranking";

interface UseBrowseCarouselArgs {
  algo: BrowseAlgo;
  userId?: string;
  genre?: string | null;
  subgenre?: string | null;
  tag?: string | null;
  tagAny?: string[] | null;
}

function useBrowseCarousel({ algo, userId, genre, subgenre, tag, tagAny }: UseBrowseCarouselArgs) {
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
    queryKey: ["browse", algo, genre ?? "all", subgenre ?? "", tag ?? "", (tagAny ?? []).join("|"), userId ?? "anon"],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0, signal }) =>
      fetchBrowseBooks({
        algo,
        userId,
        genre: genre ?? undefined,
        subgenre: subgenre ?? undefined,
        tag: tag ?? undefined,
        tagAny: tagAny ?? undefined,
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
  baseSlug: string;
  algo: BrowseAlgo;
  genre?: string | null;
  subgenre?: string | null; // display name
  subgenreSlug?: string | null; // filter slug
  tagSlugs?: string[];
  tags?: string[];
  emptyMessage?: string;
}

interface CategoryCarouselProps {
  config: CategoryConfig;
  onBookClick: (book: BookSearchResult) => void;
  onEditCategory: (config: CategoryConfig) => void;
}

function CategoryCarousel({ config, onBookClick, onEditCategory }: CategoryCarouselProps) {
  const carousel = useBrowseCarousel({
    algo: config.algo,
    userId: DEMO_USER_ID,
    genre: config.genre ?? undefined,
    subgenre: config.subgenreSlug ?? undefined,
    tagAny: config.tagSlugs ?? undefined,
  });

  const initialLoading = carousel.books.length === 0 && carousel.isLoading;
  const loadingMore = carousel.isLoading && carousel.books.length > 0;

  return (
    <HorizontalBookRow
      title={config.title}
      titleSuffix={config.subgenre ?? undefined}
      secondaryChips={config.tags}
      onEdit={() => onEditCategory(config)}
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
      let subgenre: string | null | undefined = null;
      let subgenreSlug: string | null | undefined = null;
      let tagSlugs: string[] | undefined = undefined;
      let tags: string[] | undefined = undefined;
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
        if (category.subgenreSlug) {
          subgenreSlug = category.subgenreSlug;
          subgenre = category.subgenreName ?? undefined;
        }
        if (category.tagNames && category.tagNames.length > 0) {
          tags = category.tagNames;
        }
        if (category.tagSlugs && category.tagSlugs.length > 0) {
          tagSlugs = category.tagSlugs;
        }
      }

      return {
        key: `${category.slug}-${index}`,
        title: category.name,
        baseSlug: category.slug,
        algo,
        genre,
        subgenre,
        subgenreSlug,
        tagSlugs,
        tags,
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

  const [editOpen, setEditOpen] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editGenreName, setEditGenreName] = useState<string | null>(null);
  // Stores the selected subgenre slug in the edit dialog
  const [editSubgenreSlug, setEditSubgenreSlug] = useState<string | null>(null);
  // Stores the base genre slug (e.g., "sci-fi") for filtering subgenre options.
  // Note: Hyphenated slugs must be preserved; avoid deriving from display keys.
  const [editGenreSlug, setEditGenreSlug] = useState<string | null>(null);
  const [editSubgenreName, setEditSubgenreName] = useState<string | null>(null);
  const [editTagSlugs, setEditTagSlugs] = useState<string[]>([]);
  const [editTagNames, setEditTagNames] = useState<string[]>([]);
  const [allSubgenres, setAllSubgenres] = useState<Array<{ slug: string; name: string; genre_slug?: string }>>([]);
  const [allTags, setAllTags] = useState<Array<{ slug: string; name: string; group: string }>>([]);
  const [tagSearch, setTagSearch] = useState("");

  const openEdit = async (config: CategoryConfig) => {
    // Use the actual category slug, not a key-derived value (fixes hyphenated slugs like "sci-fi")
    setEditSlug(config.baseSlug);
    setEditGenreName(config.title);
    setEditGenreSlug(config.baseSlug);
    setEditSubgenreSlug(config.subgenreSlug ?? null);
    setEditSubgenreName(config.subgenre ?? null);
    // Preserve any existing tag selections for this category
    setEditTagSlugs(config.tagSlugs ?? []);
    setEditTagNames(config.tags ?? []);
    // Always refresh taxonomy options when opening the editor so new seeds (e.g., Romance) appear.
    try {
      const res = await fetch(`/api/taxonomy-list?limit=500`);
      if (res.ok) {
        const data = await res.json();
        setAllSubgenres((data.subgenres ?? []).map((sg: any) => ({ slug: sg.slug, name: sg.name, genre_slug: sg.genre_slug })));
        setAllTags((data.tags ?? []).map((t: any) => ({ slug: t.slug, name: t.name, group: t.group })));
      }
    } catch {}
    setEditOpen(true);
  };

  const toggleEditTag = (t: { slug: string; name: string }) => {
    setEditTagSlugs((prev) => {
      const idx = prev.indexOf(t.slug);
      if (idx >= 0) {
        setEditTagNames((names) => names.filter((n) => n !== t.name));
        return prev.filter((s) => s !== t.slug);
      }
      setEditTagNames((names) => [...names, t.name]);
      return [...prev, t.slug];
    });
  };

  const saveEdit = () => {
    if (!editSlug) return;
    // update preferences
    const list = loadCategoryPreferences();
    const updated = list.map((c) => (
      c.slug === editSlug
        ? {
            ...c,
            subgenreSlug: editSubgenreSlug ?? undefined,
            subgenreName: editSubgenreName ?? undefined,
            tagSlugs: editTagSlugs,
            tagNames: editTagNames,
          }
        : c
    ));
    saveCategoryPreferences(updated);
    setEditOpen(false);
  };

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
            <div className="grid grid-cols-3 gap-3">
              {searchResults.slice(0, 15).map((book) => (
                <div key={book.googleBooksId} className="mx-auto w-32" data-testid={`search-result-${book.googleBooksId}`}>
                  <BookCard
                    title={book.title}
                    author={book.authors[0]}
                    coverUrl={book.coverUrl}
                    onClick={() => handleBookClick(book)}
                  />
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
            <CategoryCarousel key={config.key} config={config} onBookClick={handleBookClick} onEditCategory={openEdit} />
          ))}
        </div>
      )}

      {dialogOpen && (
        <Suspense fallback={null}>
          <BookDetailDialog
            book={selectedBook}
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                // Reset selection so the horizontally scrolling carousels regain pointer/touch focus.
                setSelectedBook(null);
              }
            }}
          />
        </Suspense>
      )}
      {/* Edit dialog for on-the-fly subgenre/tags */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {editGenreName} Subgenre & Tags</DialogTitle>
            <DialogDescription>Choose a subgenre and add tags. Save to refresh the carousel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Subgenre</div>
              <Select value={editSubgenreSlug ?? ""} onValueChange={(val) => {
                const sg = allSubgenres.find((x) => x.slug === val);
                setEditSubgenreSlug(val || null);
                setEditSubgenreName(((sg?.name?.includes('—') ? sg?.name?.split('—').pop() : sg?.name) ?? '').trim() || null);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={editSubgenreName || "Select a subgenre"} />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {(() => {
                    const base = (editGenreSlug || '').toLowerCase();
                    const tokenMap: Record<string, string[]> = {
                      'fantasy': ['fantasy', 'grimdark'],
                      'sci-fi': ['science-fiction', 'cyberpunk', 'dystopian', 'post-apocalyptic', 'time-travel', 'alternate-history', 'steampunk'],
                      'science-fiction': ['science-fiction', 'cyberpunk', 'dystopian', 'post-apocalyptic', 'time-travel', 'alternate-history', 'steampunk'],
                      'mystery': ['mystery', 'crime-detective', 'thriller', 'legal-thriller', 'spy-espionage'],
                      // Romance subgenres are suffixed with "-romance" and live under the Romance genre.
                      // We fall back to genre_slug match to surface the complete Romance tree.
                      'romance': ['romance'],
                    };
                    // Prefer curated token lists per genre; fallback to base slug
                    const tokens = tokenMap[base] || [base];
                    let list = allSubgenres.filter((sg) => tokens.some((t) => (sg.slug || '').startsWith(t)));
                    if (list.length === 0) {
                      // fallback to genre slug strict match
                      list = allSubgenres.filter((sg) => (sg.genre_slug || '').toLowerCase() === base);
                    }
                    const finalList = list.length > 0 ? list : allSubgenres;
                    return finalList.slice(0, 200).map((sg) => (
                      <SelectItem key={sg.slug} value={sg.slug}>{(sg.name.includes('—') ? sg.name.split('—').pop() : sg.name).trim()}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Add Tags</div>
              <Input placeholder="Search tags…" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {(() => {
                  const base = (editGenreSlug || '').toLowerCase();
                  const PRIORITY: Record<string, string[]> = {
                    romance: [
                      'enemies-to-lovers','friends-to-lovers','rivals-to-lovers','second-chance','slow-burn','insta-love','fake-dating','marriage-of-convenience','forced-proximity','love-triangle','arranged-marriage','grumpy-sunshine','secret-relationship','forbidden-love','age-gap','best-friends-sibling','sibling-best-friend','only-one-bed','mistaken-identity','pen-pals','soulmates','amnesia','secret-baby','accidental-pregnancy','sports-romance','college-romance','rockstar-romance'
                    ],
                    fantasy: ['quest','court-intrigue','political-maneuvering','found-family','magic-system','secondary-world','epic-length-600p'],
                    'science-fiction': ['first-contact','artificial-intelligence','colonization','space','near-future','time-loop'],
                    'sci-fi': ['first-contact','artificial-intelligence','colonization','space','near-future','time-loop'],
                    mystery: ['locked-room','missing-persons','police-procedural','noir','suspenseful','cold-case'],
                    horror: ['dark','bleak','survival','isolation','haunted-house','supernatural-paranormal']
                  } as const;

                  const priorityList = new Map<string, number>();
                  (PRIORITY[base] ?? []).forEach((slug, idx) => priorityList.set(slug, PRIORITY[base]!.length - idx));

                  const q = tagSearch.toLowerCase();
                  const candidates = allTags.filter((t) => {
                    const okGroup = ["tropes_themes", "setting", "tone_mood", "format"].includes(t.group);
                    const okSearch = !q || t.name.toLowerCase().includes(q) || t.group.toLowerCase().includes(q);
                    return okGroup && okSearch;
                  });

                  candidates.sort((a, b) => {
                    const selA = editTagNames.includes(a.name) ? 1 : 0;
                    const selB = editTagNames.includes(b.name) ? 1 : 0;
                    if (selA !== selB) return selB - selA; // selected first
                    const pa = priorityList.get(a.slug) ?? 0;
                    const pb = priorityList.get(b.slug) ?? 0;
                    if (pa !== pb) return pb - pa; // higher priority first
                    const ga = a.group === 'tropes_themes' ? 2 : a.group === 'setting' ? 1 : 0;
                    const gb = b.group === 'tropes_themes' ? 2 : b.group === 'setting' ? 1 : 0;
                    if (ga !== gb) return gb - ga; // trope > setting > others
                    return a.name.localeCompare(b.name);
                  });

                  return candidates.slice(0, 40).map((t) => {
                    const selected = editTagNames.includes(t.name);
                    return (
                      <button
                        type="button"
                        key={t.slug}
                        onClick={() => toggleEditTag(t)}
                        className={`text-xs px-2 py-1 rounded-full border ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80 hover:bg-muted/80'}`}
                        aria-pressed={selected}
                      >
                        {t.name}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="pt-2">
              <Button className="w-full" onClick={saveEdit}>Save changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
