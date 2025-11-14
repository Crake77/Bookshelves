import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ingestBook,
  addBookToShelf,
  getUserBooks,
  getBookStats,
  updateBookStatus,
  updateBookRating,
  getBookEditions,
  getBookSeriesInfo,
  DEMO_USER_ID,
  type BookSearchResult,
  type BookStats,
  type UserBook,
  type Edition,
  type SeriesInfo,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronDown, Minus, Plus } from "lucide-react";
import type { TaxonomyFilter } from "@/components/TaxonomyListDialog";
import { getCoverPreference } from "@/lib/cover-preferences";
//
import { useShelfPreferences } from "@/hooks/usePreferences";
import React, { Suspense as _Suspense } from "react";
const LazyTaxonomyChips = React.lazy(() => import("@/components/BookTaxonomyChips"));
const LazyTaxonomyListDialog = React.lazy(() => import("@/components/TaxonomyListDialog"));
const LazyCoverCarouselDialog = React.lazy(() => import("@/components/CoverCarouselDialog"));
const LazyBookSeriesMetadata = React.lazy(() => import("@/components/BookSeriesMetadata"));

type HydratedUserBook = UserBook & { book?: BookSearchResult };

interface BookDetailDialogProps {
  book: BookSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxonomyHint?: { kind: "tag" | "subgenre"; slug: string; label: string };
}

// Helper to format ranking with K
function formatRanking(ranking: number | null): string {
  if (!ranking) return "—";
  if (ranking >= 1000) {
    return `#${Math.round(ranking / 1000)}K`;
  }
  return `#${ranking}`;
}

export default function BookDetailDialog({ book, open, onOpenChange, taxonomyHint }: BookDetailDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState<string>("");
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [hasTypedRating, setHasTypedRating] = useState(false);
  const [coverCarouselOpen, setCoverCarouselOpen] = useState(false);
  const [preferredEditionId, setPreferredEditionId] = useState<string | null>(null);
  const [displayCoverUrl, setDisplayCoverUrl] = useState<string | undefined>(book?.coverUrl);
  const [isCoverFillMode, setIsCoverFillMode] = useState<boolean>(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [contentPadTop, setContentPadTop] = useState<number>(0);
  const [maskHeight, setMaskHeight] = useState<number>(0);
  const [isSmall, setIsSmall] = useState<boolean>(false);
  const [ingestedBookId, setIngestedBookId] = useState<string | null>(null);
  const [taxonomyDialogFilter, setTaxonomyDialogFilter] = useState<TaxonomyFilter | null>(null);
  const [taxonomySource, setTaxonomySource] = useState<{ bookId?: string; googleBooksId?: string } | null>(null);
  const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    void import("@/components/CoverCarouselDialog");
  }, []);

  useEffect(() => {
    if (!book || typeof window === "undefined") {
      setIsCoverFillMode(false);
      return;
    }
    const key = `bookshelves:cover-fit-mode:${book.googleBooksId}`;
    try {
      setIsCoverFillMode(window.localStorage.getItem(key) === "fill");
    } catch {
      setIsCoverFillMode(false);
    }

    const handleFitChange = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (detail?.bookId === book.googleBooksId) {
        setIsCoverFillMode(detail.mode === "fill");
      }
    };

    window.addEventListener("bookshelves:cover-fit-mode-changed", handleFitChange as EventListener);
    return () => {
      window.removeEventListener("bookshelves:cover-fit-mode-changed", handleFitChange as EventListener);
    };
  }, [book]);
  const lastStatusRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const openTaxonomyDialog = useCallback((filter: TaxonomyFilter) => {
    if (book) {
      setTaxonomySource({ bookId: book.id, googleBooksId: book.googleBooksId });
    } else {
      setTaxonomySource(null);
    }
    setTaxonomyDialogFilter(filter);
    setIsTaxonomyDialogOpen(true);
  }, [book]);
  const userBooksQueryKey = ["/api/user-books", DEMO_USER_ID] as const;

  // Fetch user's books to check if this book is already in library
  const { data: userBooks = [] } = useQuery({
    queryKey: userBooksQueryKey,
    queryFn: () => getUserBooks(DEMO_USER_ID),
    enabled: open && !!book,
  });

  // Find if this book is already in user's library
  const existingUserBook = userBooks.find(
    (ub: UserBook) => ub.book.googleBooksId === book?.googleBooksId
  );

  const shelfPreferences = useShelfPreferences();
  const enabledShelves = shelfPreferences.filter((shelf) => shelf.isEnabled);

  const allShelves = useMemo(() => {
    const base = enabledShelves.map((shelf) => ({ name: shelf.name, slug: shelf.slug }));
    if (selectedStatus && !base.some((shelf) => shelf.slug === selectedStatus)) {
      const existing = shelfPreferences.find((shelf) => shelf.slug === selectedStatus);
      if (existing) {
        return [...base, { name: existing.name, slug: existing.slug }];
      }
      return [...base, { name: selectedStatus.replace(/-/g, " "), slug: selectedStatus }];
    }
    return base;
  }, [enabledShelves, selectedStatus, shelfPreferences]);

  const getShelfDisplayName = (slug: string | null): string => {
    if (!slug) return "Select Shelf";
    return (
      allShelves.find((s) => s.slug === slug)?.name ??
      slug.replace(/-/g, " ")
    );
  };

  // Taxonomy moved to a lazily-loaded chunk via BookTaxonomyChips
  //
  // Layout overview (do not change dims without discussing):
  // - Mobile/tablet portrait: dialog fills the viewport with equal edges (6vw) using dvw/dvh;
  //   centered horizontally. This keeps all four margins visually equal and in-frame.
  // - Desktop: dialog uses fixed widths (sm/md/lg) and clamps height to the viewport (90dvh)
  //   with a small top offset. This prevents the bottom from overflowing while preserving
  //   the rectangular look.
  // - Header: a fixed, opaque "card" area that contains cover, title/author, stats and widgets.
  //   We render a mask overlay (maskHeight) from the header top down to a little below the
  //   divider line (beneath pages). This ensures anything that scrolls below is fully hidden
  //   behind the header, matching the behavior of the Tag/Genre popups.
  // - Scroll area: begins exactly at the divider line. We compute paddingTop based on the
  //   divider's bottom relative to the scroll container top (double requestAnimationFrame and
  //   resize observer to avoid layout drift). We also reset scrollTop on every open/book change
  //   to avoid stale scroll positions.

  // Fetch book stats (only if book is in library)
  const { data: bookStats } = useQuery({
    queryKey: ["/api/book-stats", existingUserBook?.bookId],
    queryFn: () => getBookStats(existingUserBook!.bookId),
    enabled: open && !!existingUserBook?.bookId,
  });

  useEffect(() => {
    // determine mobile/tablet portrait for edge-filling sizing
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsSmall(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function recompute() {
      const header = headerRef.current;
      const divider = dividerRef.current;
      const scroller = scrollRef.current;
      if (!header || !divider || !scroller) return;
      const hr = header.getBoundingClientRect();
      const dr = divider.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      // Mask covers header-top .. a little below divider-bottom to ensure no bleed under header controls
      setMaskHeight(Math.max(0, Math.round((dr.bottom - hr.top) + 12)));
      // Scroll begins exactly at divider-bottom (scroller coordinates)
      setContentPadTop(Math.max(0, Math.round(dr.bottom - sr.top)));
    }
    // Reset scroll position each time dialog opens or book changes
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // Double RAF to ensure layout (fonts, images) settle before measuring
    requestAnimationFrame(() => requestAnimationFrame(recompute));
    const ro = new ResizeObserver(() => recompute());
    if (headerRef.current) ro.observe(headerRef.current);
    if (dividerRef.current) ro.observe(dividerRef.current);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      ro.disconnect();
    };
  }, [open, existingUserBook, bookStats, book?.googleBooksId]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && existingUserBook) {
      setSelectedStatus(existingUserBook.status ?? null);
      setRatingInput(existingUserBook.rating?.toString() || "");
      setHasTypedRating(false);
      setIngestedBookId(existingUserBook.bookId);
      lastStatusRef.current = existingUserBook.status ?? null;
    } else if (open) {
      setSelectedStatus(null);
      setRatingInput("");
      setHasTypedRating(false);
      setIngestedBookId(null);
      lastStatusRef.current = null;
    }
  }, [open, existingUserBook]);

  useEffect(() => {
    if (!open) {
      setIsTaxonomyDialogOpen(false);
      setTaxonomyDialogFilter(null);
      setTaxonomySource(null);
    }
  }, [open]);

  const ingestMutation = useMutation({ mutationFn: ingestBook });

  const addToShelfMutation = useMutation({
    mutationFn: async ({ bookId, status }: { bookId: string; status: string | null }) => {
      return addBookToShelf(DEMO_USER_ID, bookId, status);
    },
    onSuccess: (created) => {
      setSelectedStatus(created.status ?? null);
      toast({
        title: "Saved to library!",
        description: created.status
          ? `"${book?.title ?? "Book"}" added to ${getShelfDisplayName(created.status)}.`
          : `"${book?.title ?? "Book"}" added to your library.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add book to shelf",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Defer refetch to avoid conflicting with dialog close and state updates
      // The query data is already updated optimistically, so refetch can wait
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: userBooksQueryKey });
      }, 500);
      // Don't invalidate browse queries here to prevent screen freeze
      // BrowsePage queries will refetch naturally when navigated to
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userBookId, status }: { userBookId: string; status: string | null }) => {
      return updateBookStatus(userBookId, status);
    },
    onMutate: async ({ userBookId, status }) => {
      await queryClient.cancelQueries({ queryKey: userBooksQueryKey });

      const previous = queryClient.getQueryData(userBooksQueryKey) as HydratedUserBook[] | undefined;

      if (previous) {
        queryClient.setQueryData(
          userBooksQueryKey,
          previous.map((userBook) =>
            userBook.id === userBookId ? { ...userBook, status } : userBook
          )
        );
      }

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userBooksQueryKey, context.previous);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update shelf",
        variant: "destructive",
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        userBooksQueryKey,
        (current: HydratedUserBook[] | undefined) =>
          current
            ? current.map((userBook) =>
                userBook.id === updated.id
                  ? { ...userBook, status: updated.status ?? null }
                  : userBook
              )
            : current
      );
      setSelectedStatus(updated.status ?? null);
      toast({
        title: updated.status ? "Shelf updated!" : "Removed from shelves",
        description: updated.status
          ? `"${book?.title ?? "Book"}" moved to ${getShelfDisplayName(updated.status)}.`
          : `"${book?.title ?? "Book"}" removed from your shelves.`,
        variant: updated.status ? "default" : "destructive",
      });
    },
    onSettled: () => {
      // Close dialog after all mutations settle to prevent freeze
      // Use setTimeout to ensure React has processed all state updates
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
    },
  });

  const updateRatingMutation = useMutation({
    mutationFn: async ({ userBookId, rating }: { userBookId: string; rating: number }) => {
      return updateBookRating(userBookId, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userBooksQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/book-stats"] });
      toast({
        title: "Rating saved!",
        description: `Your rating has been updated.`,
      });
    },
  });

  // Make sure the book exists in the backend before we try to save shelf/rating state.
  const ensureBookIngested = async (): Promise<string> => {
    if (existingUserBook?.bookId) {
      return existingUserBook.bookId;
    }
    if (ingestedBookId) {
      return ingestedBookId;
    }
    if (!book) {
      throw new Error("Book not available");
    }

    // Ingestion is gated off by default. If the book isn't already present,
    // require an existing DB id on the provided book payload and skip ingestion.
    const maybeId = (book as unknown as { id?: string })?.id;
    if (maybeId && typeof maybeId === "string" && maybeId.length > 0) {
      setIngestedBookId(maybeId);
      return maybeId;
    }

    throw new Error("This title isn't in the library yet. Ingestion is disabled.");
  };

  const handleShelfSelection = async (status: string | null) => {
    if (!book) return;

    setSelectedStatus(status);

    if (existingUserBook) {
      lastStatusRef.current = status;
      updateStatusMutation.mutate({
        userBookId: existingUserBook.id,
        status,
      });
      return;
    }

    try {
      const bookId = await ensureBookIngested();
      addToShelfMutation.mutate({
        bookId,
        status,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add book:", error);
      setSelectedStatus(null);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add book to shelf",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRating = async () => {
    const rating = parseInt(ratingInput, 10);
    if (Number.isNaN(rating) || rating < 0 || rating > 100) {
      toast({
        title: "Invalid rating",
        description: "Please enter a number between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    try {
      let targetUserBook: HydratedUserBook | undefined = existingUserBook;

      if (!targetUserBook) {
        // When launched from Browse, the user may not have the title in their library yet.
        // We ingest + add it to the shelf on the fly so rating always has a backing user_book row.
        if (!book) throw new Error("Book unavailable");
        const bookId = await ensureBookIngested();
        const created = await addBookToShelf(DEMO_USER_ID, bookId, selectedStatus ?? null);
        const normalized: HydratedUserBook = created.book
          ? created
          : { ...created, book };

        queryClient.setQueryData(
          userBooksQueryKey,
          (current: HydratedUserBook[] | undefined) => {
            if (!current) return [normalized];
            const exists = current.some((ub) => ub.id === normalized.id);
            return exists
              ? current.map((ub) => (ub.id === normalized.id ? normalized : ub))
              : [...current, normalized];
          },
        );

        targetUserBook = normalized;
        setSelectedStatus(created.status ?? null);
        lastStatusRef.current = created.status ?? null;
        setIngestedBookId(created.bookId);
      }

      if (!targetUserBook) throw new Error("Unable to resolve library entry");

      await updateRatingMutation.mutateAsync({
        userBookId: targetUserBook.id,
        rating,
      });
      setIsRatingOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const adjustRating = (delta: number) => {
    const current = parseInt(ratingInput) || 0;
    const newValue = Math.max(0, Math.min(100, current + delta));
    setRatingInput(newValue.toString());
    setHasTypedRating(true);
  };

  const handleNumberPad = (num: string) => {
    setRatingInput((prev) => {
      const base = !hasTypedRating || prev === "0" ? "" : prev;
      const candidate = base + num;
      const parsed = parseInt(candidate, 10);
      if (Number.isNaN(parsed) || parsed > 100) {
        return prev;
      }
      if (!hasTypedRating) {
        setHasTypedRating(true);
      }
      return candidate;
    });
  };

  const handleBackspace = () => {
    setRatingInput((prev) => {
      if (!hasTypedRating) {
        setHasTypedRating(false);
        return "0";
      }
      const next = prev.slice(0, -1) || "0";
      if (next === "0") {
        setHasTypedRating(false);
      }
      return next;
    });
  };

  const handleClearRating = () => {
    setRatingInput("0");
    setHasTypedRating(false);
  };

  useEffect(() => {
    if (isRatingOpen) {
      setHasTypedRating(false);
    }
  }, [isRatingOpen, book?.googleBooksId]);

  // Fetch editions for cover selection (preload even before cover dialog opens)
  const {
    data: editions = [],
    error: editionsError,
    isLoading: editionsLoading,
    isFetching: editionsFetching,
  } = useQuery({
    queryKey: ["/api/books", book?.googleBooksId, "editions"],
    queryFn: () => getBookEditions(book!.googleBooksId),
    enabled: !!book?.googleBooksId,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch series info
  const { data: seriesInfo, error: seriesInfoError } = useQuery({
    queryKey: ["/api/books", book?.googleBooksId, "series-info"],
    queryFn: () => getBookSeriesInfo(book!.googleBooksId),
    enabled: open && !!book?.googleBooksId,
  });

  // Debug logging
  useEffect(() => {
    if (open && book?.googleBooksId) {
      console.log("[BookDetailDialog] Editions:", editions.length, "Error:", editionsError);
      console.log("[BookDetailDialog] Series Info:", seriesInfo, "Error:", seriesInfoError);
      console.log("[BookDetailDialog] Cover Carousel Open:", coverCarouselOpen);
    }
  }, [open, book?.googleBooksId, editions, editionsError, seriesInfo, seriesInfoError, coverCarouselOpen]);

  // Load cover preference and update display cover
  useEffect(() => {
    if (!book) return;
    
    const preference = getCoverPreference(book.googleBooksId);
    if (preference) {
      setDisplayCoverUrl(preference.coverUrl);
      setPreferredEditionId(preference.editionId);
    } else {
      setDisplayCoverUrl(book.coverUrl);
      setPreferredEditionId(null);
    }
  }, [book]);

  // Listen for cover preference changes
  useEffect(() => {
    if (!book) return;
    
    const handleCoverChange = (e: CustomEvent) => {
      if (e.detail.bookId === book.googleBooksId) {
        setDisplayCoverUrl(e.detail.coverUrl || book.coverUrl);
        setPreferredEditionId(e.detail.editionId ?? null);
      }
    };
    
    window.addEventListener("bookshelves:cover-preference-changed", handleCoverChange as EventListener);
    return () => {
      window.removeEventListener("bookshelves:cover-preference-changed", handleCoverChange as EventListener);
    };
  }, [book]);

  if (!book) return null;

  const isShelfUpdating =
    ingestMutation.isPending ||
    addToShelfMutation.isPending ||
    updateStatusMutation.isPending;
  const isRatingPending = updateRatingMutation.isPending;

  const hasAssignedShelf = Boolean(selectedStatus);
  const selectedShelfName = getShelfDisplayName(selectedStatus);
  const selectOptionLabel = hasAssignedShelf ? "Remove" : "Select Shelf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Sizing rules (documented):
        - Dialog is centered by base variant; we set top/width/height using dvw/dvh minus equal margins (6vw) so all edges are equal on mobile.
        - Header (cover/title/author + stats + widgets) is fixed and opaque; divider line marks submerge boundary.
        - Scroll area is padded to divider.bottom (measured) so content begins AT the line and scrolls under it.
      */}
      <DialogContent
        data-variant="book-detail"
        className={cn(
          "flex !translate-y-0 flex-col overflow-hidden p-0",
          // Let the dialog's variant styles control top/size; only refine at larger breakpoints
          "sm:rounded-[32px] sm:border sm:border-border/40 sm:w-[26rem] sm:max-w-[26rem]",
          "md:w-[27rem] md:max-w-[27rem] lg:w-[28rem] lg:max-w-[28rem]"
        )}
        style={
          isSmall
            ? {
                top: `max(6vw, env(safe-area-inset-top))`,
                left: '50%',
                transform: 'translate(-50%, 0)',
                width: 'calc(100dvw - 12vw)',
                height: 'calc(100dvh - 12vw)',
                maxWidth: 'calc(100dvw - 12vw)',
                maxHeight: 'calc(100dvh - 12vw)',
              }
            : {
                top: '5vh',
                left: '50%',
                transform: 'translate(-50%, 0)',
                height: '90dvh',
                maxHeight: '90dvh',
              }
        }
        data-testid="dialog-book-detail"
      >
        <div className="relative h-full">
          {/* Fixed card area (cover/title/author + stats + widgets) */}
          <div ref={headerRef} className="absolute inset-x-0 top-0 z-10" style={{ height: 'min(58vh, 420px)' }}>
            {/* Opaque mask covers only down to the divider line */}
            <div
              className="absolute left-0 right-0 top-0 z-0 bg-background"
              style={{ height: maskHeight }}
            />
            {/* Cover and Title Section */}
            <div className="relative z-10 overflow-hidden px-6 pt-8 pb-4 text-center">
              {(displayCoverUrl || book.coverUrl) ? (
                <>
                  <img
                    src={displayCoverUrl || book.coverUrl}
                    alt={book.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-40 blur-xl -z-20"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent -z-10" />
                </>
              ) : (
                <div className="absolute inset-0 bg-muted/40 -z-10" />
              )}

              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                {(displayCoverUrl || book.coverUrl) && (
                  <div
                    className="relative cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("[BookDetailDialog] Cover clicked, opening carousel. Editions:", editions.length);
                      setCoverCarouselOpen(true);
                    }}
                    title="Click to select cover edition"
                  >
                    <div
                      className={cn(
                        "w-32 h-48 rounded-lg flex items-center justify-center shadow-2xl transition-transform group-hover:scale-[1.03]",
                        isCoverFillMode ? "bg-background" : "bg-black",
                      )}
                    >
                      <img
                        src={displayCoverUrl || book.coverUrl}
                        alt={book.title}
                        className={cn(
                          "max-h-full max-w-full",
                          isCoverFillMode ? "object-cover w-full h-full rounded-lg" : "object-contain",
                        )}
                        data-testid="img-book-cover"
                      />
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                  </div>
                )}
                <h2 className="font-display text-xl font-bold" data-testid="text-book-title">{book.title}</h2>
                
                {/* Series Metadata - appears beneath title */}
                {seriesInfo && seriesInfo.series && (
                  <_Suspense fallback={null}>
                    <LazyBookSeriesMetadata
                      series={seriesInfo.series}
                      seriesOrder={seriesInfo.seriesOrder ?? null}
                      totalBooksInSeries={seriesInfo.totalBooksInSeries ?? null}
                      onSeriesClick={() => {
                        openTaxonomyDialog({
                          kind: "series",
                          slug: seriesInfo.series!.toLowerCase().replace(/\s+/g, "-"),
                          label: seriesInfo.series!,
                        });
                      }}
                      onPositionClick={() => {
                        openTaxonomyDialog({
                          kind: "series-position",
                          slug: seriesInfo.series!.toLowerCase().replace(/\s+/g, "-"),
                          label: seriesInfo.series!,
                          seriesOrder: seriesInfo.seriesOrder!,
                        });
                      }}
                    />
                  </_Suspense>
                )}
                
                {book.authors.length > 0 && (
                  <div
                    className="flex flex-wrap justify-center gap-2"
                    data-testid="text-book-author"
                  >
                    {book.authors.map((author, index) => {
                      const trimmed = author.trim();
                      const key = `${trimmed}-${index}`;
                      return (
                        <Badge
                          key={key}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => openTaxonomyDialog({ kind: "author", slug: trimmed, label: trimmed })}
                        >
                          {trimmed}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Section */}
            {existingUserBook && bookStats && (
              <div className="relative z-10 px-6 py-2">
                <div className="flex items-center justify-center gap-6 text-sm">
                  {bookStats.averageRating !== null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{bookStats.averageRating}%</div>
                      <div className="text-xs text-muted-foreground">AVG SCORE</div>
                    </div>
                  )}
                  {bookStats.ranking !== null && (
                    <div className="text-center">
                      <div className="text-lg font-semibold">{formatRanking(bookStats.ranking)}</div>
                      <div className="text-xs text-muted-foreground">HIGHEST RATED</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Widgets Section with divider line */}
            <div ref={dividerRef} className="relative z-10 px-6 pb-3 border-b border-border/50">
              <div className="grid grid-cols-3 gap-3">
            {/* Left Widget - Shelf Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between text-xs h-auto py-2 px-3"
                  disabled={isShelfUpdating}
                  data-testid="button-shelf-selector"
                >
                  <span className="truncate">{selectedShelfName}</span>
                  <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuItem
                  key="__select"
                  onSelect={() => {
                    void handleShelfSelection(null);
                  }}
                  disabled={isShelfUpdating}
                  className={hasAssignedShelf ? "text-destructive focus:text-destructive" : ""}
                  data-testid="option-shelf-none"
                >
                  {selectOptionLabel}
                </DropdownMenuItem>
                {allShelves.map((shelf) => (
                  <DropdownMenuItem
                    key={shelf.slug}
                    onSelect={() => {
                      void handleShelfSelection(shelf.slug);
                    }}
                    disabled={isShelfUpdating}
                    data-testid={`option-shelf-${shelf.slug}`}
                  >
                    {shelf.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Middle Widget - Progress/Info */}
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              {book.pageCount ? `${book.pageCount} pages` : "—"}
            </div>

            {/* Right Widget - Score Input */}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs h-auto py-2 px-3"
              disabled={isShelfUpdating}
              data-testid="button-rating-trigger"
              onClick={() => setIsRatingOpen(true)}
            >
              {ratingInput ? (
                <span className="font-semibold">{ratingInput}%</span>
              ) : (
                <span className="text-muted-foreground">Score</span>
              )}
            </Button>
              </div>
            </div>
          </div>

          {/* Scrollable content under the fixed card header; pad to divider bottom so submerge starts AT the line */}
          <div ref={scrollRef} className="h-full overflow-y-auto" style={{ paddingTop: contentPadTop }}>
            {/* Taxonomy chips (above Summary) — lazy so dialog core mounts first */}
            {book && (
              <_Suspense fallback={null}>
                {/* Key ensures fresh mount per book so ingest logic runs per selection */}
                <LazyTaxonomyChips
                  key={book.googleBooksId}
                  book={book}
                  hint={taxonomyHint}
                  onOpenFilter={openTaxonomyDialog}
                />
              </_Suspense>
            )}

            {/* Summary Section */}
            {book.description && (
              <div className="px-6 py-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Summary</h3>
                <p className="text-sm text-foreground/90 leading-relaxed" data-testid="text-book-description">{book.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inline bottom sheet aligned to dialog width */}
        {isRatingOpen && (
          <>
            <div
              className="absolute inset-0 bg-background/50"
              onClick={() => setIsRatingOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 z-10">
              <div
                className="bg-background rounded-t-3xl border-t border-border shadow-2xl overflow-hidden flex h-full flex-col"
                style={{ height: 'min(60vh, 500px)', minHeight: '380px' }}
              >
                <div className="flex justify-center py-2">
                  <div className="h-1.5 w-10 rounded-full bg-muted" />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="px-6 pb-0 border-b border-border/50">
                    <div className="text-center mb-1">
                      <div className="text-sm text-muted-foreground mb-1">Score</div>
                      <div className="text-6xl font-bold tracking-tight">
                        {ratingInput || '0'}
                      </div>
                    </div>
                    {/* Keep the controls tight so the keypad rows mirror the spacing beneath them. */}
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustRating(-1)}
                        className="h-12 w-12 rounded-full"
                        data-testid="button-rating-decrease"
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <Button
                        onClick={handleUpdateRating}
                        className="px-8"
                        disabled={isRatingPending}
                        data-testid="button-save-rating"
                      >
                        {isRatingPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => adjustRating(1)}
                        className="h-12 w-12 rounded-full"
                        data-testid="button-rating-increase"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 px-4 pt-0 pb-3 flex flex-col justify-end">
                    <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                      {[1,2,3,4,5,6,7,8,9].map((num) => (
                        <Button
                          key={num}
                          variant="ghost"
                          onClick={() => handleNumberPad(num.toString())}
                          className="h-12 text-lg font-medium hover-elevate"
                          data-testid={`button-numpad-${num}`}
                        >
                          {num}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        onClick={handleBackspace}
                        className="h-12 text-lg font-medium hover-elevate"
                        data-testid="button-numpad-backspace"
                      >
                        ←
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleNumberPad('0')}
                        className="h-12 text-lg font-medium hover-elevate"
                        data-testid="button-numpad-0"
                      >
                        0
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleClearRating}
                        className="h-12 text-lg font-medium hover-elevate"
                        data-testid="button-numpad-clear"
                      >
                        C
                      </Button>
                    </div>
                    <div className="pointer-events-none" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
                    <div className="pointer-events-none" style={{ height: 'constant(safe-area-inset-bottom, 0px)' }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
      <_Suspense fallback={null}>
        <LazyTaxonomyListDialog
          open={isTaxonomyDialogOpen}
          onOpenChange={(next) => {
            setIsTaxonomyDialogOpen(next);
            if (!next) {
              setTaxonomyDialogFilter(null);
              setTaxonomySource(null);
            }
          }}
          filter={taxonomyDialogFilter}
          sourceBookId={taxonomySource?.bookId}
          sourceGoogleBooksId={taxonomySource?.googleBooksId}
        />
        <LazyCoverCarouselDialog
          open={coverCarouselOpen}
          onOpenChange={setCoverCarouselOpen}
          bookId={book.googleBooksId}
          bookTitle={book.title}
          editions={editions}
          fallbackCoverUrl={book.coverUrl}
          isLoading={editionsLoading || editionsFetching}
          selectedEditionId={preferredEditionId ?? undefined}
          onSelect={(editionId, coverUrl) => {
            setDisplayCoverUrl(coverUrl);
            setPreferredEditionId(editionId);
            // Trigger re-render of book cards if needed
            queryClient.invalidateQueries({ queryKey: ["/api/user-books"] });
          }}
        />
      </_Suspense>
    </Dialog>
  );
}
