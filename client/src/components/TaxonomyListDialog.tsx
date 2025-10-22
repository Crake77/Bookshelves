import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DEMO_USER_ID, fetchBrowseBooks, type BookSearchResult, type BrowseAlgo } from "@/lib/api";
import React, { lazy, Suspense } from "react";
import BookCard from "@/components/BookCard";
const BookDetailDialog = lazy(() => import("@/components/BookDetailDialog"));

type Kind = "genre" | "subgenre" | "tag";

export interface TaxonomyFilter {
  kind: Kind;
  slug: string; // for genre, this is the display label we search categories by
  label: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: TaxonomyFilter | null;
  ranking?: BrowseAlgo; // optional; default popular
}

const PAGE_SIZE = 24;

function useTaxonomyInfinite(filter: TaxonomyFilter | null, ranking: BrowseAlgo) {
  return useInfiniteQuery({
    queryKey: ["taxonomy-list", filter?.kind ?? "", filter?.slug ?? "", ranking],
    enabled: !!filter,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0, signal }) => {
      if (!filter) return [] as BookSearchResult[];
      const params: any = { algo: ranking, userId: DEMO_USER_ID, limit: PAGE_SIZE, offset: pageParam, signal };
      if (filter.kind === "genre") params.genreSlug = filter.slug; // taxonomy genre slug
      if (filter.kind === "subgenre") params.subgenre = filter.slug;
      if (filter.kind === "tag") params.tag = filter.slug;
      return fetchBrowseBooks(params);
    },
    getNextPageParam: (lastPage: BookSearchResult[], _pages, lastPageParam: number) =>
      Array.isArray(lastPage) && lastPage.length === PAGE_SIZE ? lastPageParam + PAGE_SIZE : undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export default function TaxonomyListDialog({ open, onOpenChange, filter, ranking = "popular" }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useTaxonomyInfinite(filter, ranking);
  const books = useMemo(() => (data?.pages ?? []).flat(), [data]);
  const [selectedBook, setSelectedBook] = React.useState<BookSearchResult | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const el = loadMoreRef.current;
    const root = scrollRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void fetchNextPage();
      }
    }, { root: root ?? undefined, rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [open, hasNextPage, fetchNextPage]);

  const header = useMemo(() => {
    if (!filter) return "";
    if (filter.kind === "tag") return `#${filter.label}`;
    return filter.label;
  }, [filter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-variant="book-detail"
        className={cn(
          "flex !translate-y-0 flex-col overflow-hidden p-0",
          "!top-[3vh] h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] w-[92vw] max-w-[92vw]",
          "sm:!top-[4vh] sm:h-[90vh] sm:max-h-[90vh] sm:w-[26rem] sm:max-w-[26rem] sm:rounded-[32px] sm:border sm:border-border/40",
          "md:w-[27rem] md:max-w-[27rem] lg:w-[28rem] lg:max-w-[28rem]"
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-border/50">
          <h2 className="font-display text-lg font-semibold truncate" data-testid="taxonomy-dialog-header">{header}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Browse books for this {filter?.kind === "tag" ? "tag" : "category"}.
          </p>
        </div>

        {/* Grid */}
        <div ref={scrollRef} className="px-4 py-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            {books.map((b) => (
              <div key={b.googleBooksId} className="mx-auto w-32" data-testid={`taxonomy-book-${b.googleBooksId}`}>
                <BookCard
                  title={b.title}
                  author={b.authors?.[0] ?? "Unknown"}
                  coverUrl={b.coverUrl}
                  onClick={() => setSelectedBook(b)}
                />
              </div>
            ))}
          </div>

          {hasNextPage && (
            <div ref={loadMoreRef} className="h-10" aria-hidden />
          )}

          {isFetchingNextPage && (
            <div className="text-center text-muted-foreground py-3 text-xs">Loading more…</div>
          )}
        </div>
        {/* Nested book dialog */}
        {selectedBook && (
          <Suspense fallback={null}>
            <BookDetailDialog
              book={selectedBook}
              open={!!selectedBook}
              onOpenChange={(v) => !v && setSelectedBook(null)}
              taxonomyHint={filter && (filter.kind === "tag" || filter.kind === "subgenre") ? {
                kind: filter.kind,
                slug: filter.slug,
                label: filter.label
              } : undefined}
            />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}
