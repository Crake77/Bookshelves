import { useState, useEffect, useRef, useMemo } from "react";
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
  DEMO_USER_ID,
  type BookSearchResult,
  type BookStats,
  type UserBook,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronDown, Minus, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useShelfPreferences } from "@/hooks/usePreferences";
import { getBookTaxonomy } from "@/lib/api";
import { navigateToBrowseWithFilter } from "@/lib/browseFilter";

type HydratedUserBook = UserBook & { book?: BookSearchResult };

interface BookDetailDialogProps {
  book: BookSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to format ranking with K
function formatRanking(ranking: number | null): string {
  if (!ranking) return "—";
  if (ranking >= 1000) {
    return `#${Math.round(ranking / 1000)}K`;
  }
  return `#${ranking}`;
}

export default function BookDetailDialog({ book, open, onOpenChange }: BookDetailDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [ratingInput, setRatingInput] = useState<string>("");
  const [isRatingPopoverOpen, setIsRatingPopoverOpen] = useState(false);
  const [ingestedBookId, setIngestedBookId] = useState<string | null>(null);
  const { toast } = useToast();
  const lastStatusRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
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

  // Fetch taxonomy (best-effort). If the book hasn't been seeded to DB (e.g., external search only), this may return null.
  const { data: taxonomy } = useQuery({
    queryKey: ["/api/book-taxonomy", book?.googleBooksId],
    queryFn: () => getBookTaxonomy(book!.googleBooksId),
    enabled: open && !!book?.googleBooksId,
  });

  const [showAllTags, setShowAllTags] = useState(false);

  // If the book has not been ingested yet, taxonomy may be empty. Ingest on open
  // (best-effort) so chips can appear without requiring the user to add the book
  // to a shelf first. Refetch taxonomy afterwards.
  const ingestAttemptedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !book?.googleBooksId) return;
    // Reset attempt marker when book changes
    if (ingestAttemptedRef.current && ingestAttemptedRef.current !== book.googleBooksId) {
      ingestAttemptedRef.current = null;
    }
    const alreadyTried = ingestAttemptedRef.current === book.googleBooksId;
    if (taxonomy || alreadyTried) return;
    (async () => {
      try {
        ingestAttemptedRef.current = book.googleBooksId;
        await ingestMutation.mutateAsync(book);
        // Give the server a brief moment, then refetch taxonomy
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/book-taxonomy", book.googleBooksId] });
        }, 50);
      } catch (e) {
        // Ignore ingest failures; chips remain hidden if unavailable
        console.warn("[book-dialog] auto-ingest skipped:", (e as any)?.message ?? e);
      }
    })();
  }, [open, book, taxonomy, ingestMutation, queryClient]);

  // Fetch book stats (only if book is in library)
  const { data: bookStats } = useQuery({
    queryKey: ["/api/book-stats", existingUserBook?.bookId],
    queryFn: () => getBookStats(existingUserBook!.bookId),
    enabled: open && !!existingUserBook?.bookId,
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open && existingUserBook) {
      setSelectedStatus(existingUserBook.status ?? null);
      setRatingInput(existingUserBook.rating?.toString() || "");
      setIngestedBookId(existingUserBook.bookId);
      lastStatusRef.current = existingUserBook.status ?? null;
    } else if (open) {
      setSelectedStatus(null);
      setRatingInput("");
      setIngestedBookId(null);
      lastStatusRef.current = null;
    }
  }, [open, existingUserBook]);

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
      queryClient.refetchQueries({ queryKey: userBooksQueryKey });
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

    const ingestedBook = await ingestMutation.mutateAsync(book);
    if (!ingestedBook?.id) {
      throw new Error("Ingest did not return book ID");
    }
    setIngestedBookId(ingestedBook.id);
    return ingestedBook.id;
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
    if (!existingUserBook) return;
    const rating = parseInt(ratingInput);
    if (isNaN(rating) || rating < 0 || rating > 100) {
      toast({
        title: "Invalid rating",
        description: "Please enter a number between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    await updateRatingMutation.mutateAsync({
      userBookId: existingUserBook.id,
      rating,
    });
    setIsRatingPopoverOpen(false);
  };

  const adjustRating = (delta: number) => {
    const current = parseInt(ratingInput) || 0;
    const newValue = Math.max(0, Math.min(100, current + delta));
    setRatingInput(newValue.toString());
  };

  const handleNumberPad = (num: string) => {
    const current = ratingInput || "0";
    const newValue = current === "0" ? num : current + num;
    const parsed = parseInt(newValue);
    if (parsed <= 100) {
      setRatingInput(newValue);
    }
  };

  const handleBackspace = () => {
    setRatingInput(prev => prev.slice(0, -1) || "0");
  };

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
      <DialogContent
        data-variant="book-detail"
        className={cn(
          "flex !translate-y-0 flex-col overflow-hidden p-0",
          "!top-[3vh] h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] w-[92vw] max-w-[92vw]",
          "sm:!top-[4vh] sm:h-[90vh] sm:max-h-[90vh] sm:w-[26rem] sm:max-w-[26rem] sm:rounded-[32px] sm:border sm:border-border/40",
          "md:w-[27rem] md:max-w-[27rem] lg:w-[28rem] lg:max-w-[28rem]"
        )}
        data-testid="dialog-book-detail"
      >
        <div className="flex-1 overflow-y-auto">
        {/* Cover and Title Section */}
        <div className="relative overflow-hidden px-6 pt-10 pb-6 text-center">
          {book.coverUrl ? (
            <>
              <img
                src={book.coverUrl}
                alt={book.title}
                className="absolute inset-0 h-full w-full object-cover opacity-40 blur-xl -z-20"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent -z-10" />
            </>
          ) : (
            <div className="absolute inset-0 bg-muted/40 -z-10" />
          )}

          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            {book.coverUrl && (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-32 h-48 rounded-lg object-cover shadow-2xl"
                data-testid="img-book-cover"
              />
            )}

            <h2
              className="font-display text-xl font-bold"
              data-testid="text-book-title"
            >
              {book.title}
            </h2>
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-book-author"
            >
              {book.authors.join(", ")}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        {existingUserBook && bookStats && (
          <div className="px-6 py-3 border-b border-border/50">
            <div className="flex items-center justify-center gap-6 text-sm">
              {bookStats.averageRating !== null && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {bookStats.averageRating}%
                  </div>
                  <div className="text-xs text-muted-foreground">AVG SCORE</div>
                </div>
              )}
              {bookStats.ranking !== null && (
                <div className="text-center">
                  <div className="text-lg font-semibold">
                    {formatRanking(bookStats.ranking)}
                  </div>
                  <div className="text-xs text-muted-foreground">HIGHEST RATED</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widgets Section */}
        <div className="px-6 py-4 border-b border-border/50">
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
            <Popover open={isRatingPopoverOpen} onOpenChange={setIsRatingPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center text-xs h-auto py-2 px-3"
                  disabled={!existingUserBook}
                  data-testid="button-rating-trigger"
                >
                  {ratingInput ? (
                    <span className="font-semibold">{ratingInput}%</span>
                  ) : (
                    <span className="text-muted-foreground">Score</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-full max-w-md p-0 border-0" 
                align="center"
                side="bottom"
                sideOffset={-200}
              >
                <div className="bg-background rounded-t-3xl shadow-2xl" style={{ height: '33vh', minHeight: '300px' }}>
                  {/* Display and Controls */}
                  <div className="p-6 pb-4 border-b border-border/50">
                    <div className="text-center mb-4">
                      <div className="text-sm text-muted-foreground mb-2">Score</div>
                      <div className="text-6xl font-bold tracking-tight">
                        {ratingInput || "0"}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 mb-4">
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
                        {isRatingPending ? "Saving..." : "Save"}
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

                  {/* Number Pad */}
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
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
                        onClick={() => handleNumberPad("0")}
                        className="h-12 text-lg font-medium hover-elevate"
                        data-testid="button-numpad-0"
                      >
                        0
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setRatingInput("0")}
                        className="h-12 text-lg font-medium hover-elevate"
                        data-testid="button-numpad-clear"
                      >
                        C
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Taxonomy chips (above Summary) */}
        {(taxonomy?.genre || taxonomy?.subgenre || (taxonomy?.tags?.length ?? 0) > 0) && (
          <div className="px-6 py-4 border-b border-border/50">
            <div className="flex items-start gap-4">
              {/* TAGS (left, many chips) */}
              <div className="flex-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {(showAllTags ? taxonomy?.tags ?? [] : (taxonomy?.tags ?? []).slice(0, 12)).map((t) => (
                    <Badge
                      key={t.slug}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => navigateToBrowseWithFilter({ kind: "tag", slug: t.slug, label: t.name })}
                    >
                      #{t.name}
                    </Badge>
                  ))}
                </div>
                {((taxonomy?.tags?.length ?? 0) > 12) && (
                  <div className="mt-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowAllTags((v) => !v)}>
                      {showAllTags ? "Show Less" : `Show All ${(taxonomy?.allTagCount ?? taxonomy?.tags?.length) || 0} Tags`}
                    </Button>
                  </div>
                )}
              </div>

              {/* GENRES (right, 1–2 chips) */}
              <div className="w-40 flex-shrink-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Genres</div>
                <div className="flex flex-wrap gap-2">
                  {taxonomy?.genre && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => navigateToBrowseWithFilter({ kind: "genre", slug: taxonomy.genre.slug, label: taxonomy.genre.name })}
                    >
                      {taxonomy.genre.name}
                    </Badge>
                  )}
                  {taxonomy?.subgenre && (
                    <Badge
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => navigateToBrowseWithFilter({ kind: "subgenre", slug: taxonomy.subgenre.slug, label: taxonomy.subgenre.name })}
                    >
                      {taxonomy.subgenre.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        {book.description && (
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Summary
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-6" data-testid="text-book-description">
              {book.description}
            </p>
          </div>
        )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
