import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  getCustomShelves, 
  getUserBooks,
  getBookStats,
  updateBookStatus,
  updateBookRating,
  DEMO_USER_ID, 
  type BookSearchResult,
  type BookStats,
  type UserBook
} from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { ChevronDown, Minus, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [selectedStatus, setSelectedStatus] = useState<string>("reading");
  const [ratingInput, setRatingInput] = useState<string>("");
  const [isRatingPopoverOpen, setIsRatingPopoverOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user's books to check if this book is already in library
  const { data: userBooks = [] } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
    enabled: open && !!book,
  });

  // Find if this book is already in user's library
  const existingUserBook = userBooks.find(
    (ub: UserBook) => ub.book.googleBooksId === book?.googleBooksId
  );

  // Fetch custom shelves
  const { data: customShelves = [] } = useQuery({
    queryKey: ["/api/custom-shelves", DEMO_USER_ID],
    queryFn: () => getCustomShelves(DEMO_USER_ID),
    enabled: open,
  });

  // Fetch book stats (only if book is in library)
  const { data: bookStats } = useQuery({
    queryKey: ["/api/book-stats", existingUserBook?.bookId],
    queryFn: () => getBookStats(existingUserBook!.bookId),
    enabled: open && !!existingUserBook?.bookId,
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open && existingUserBook) {
      setSelectedStatus(existingUserBook.status);
      setRatingInput(existingUserBook.rating?.toString() || "");
    } else if (open) {
      setSelectedStatus("reading");
      setRatingInput("");
    }
  }, [open, existingUserBook]);

  const ingestMutation = useMutation({
    mutationFn: ingestBook,
  });

  const addToShelfMutation = useMutation({
    mutationFn: async ({ bookId, status }: { bookId: string; status: string }) => {
      return addBookToShelf(DEMO_USER_ID, bookId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-books"] });
      toast({
        title: "Added to shelf!",
        description: `"${book?.title}" has been added to your library.`,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userBookId, status }: { userBookId: string; status: string }) => {
      return updateBookStatus(userBookId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-books"] });
      toast({
        title: "Shelf updated!",
        description: `Book moved to ${selectedStatus}.`,
      });
    },
  });

  const updateRatingMutation = useMutation({
    mutationFn: async ({ userBookId, rating }: { userBookId: string; rating: number }) => {
      return updateBookRating(userBookId, rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/book-stats"] });
      toast({
        title: "Rating saved!",
        description: `Your rating has been updated.`,
      });
    },
  });

  const handleAddToShelf = async () => {
    if (!book) return;

    try {
      console.log("Ingesting book:", book);
      const ingestedBook = await ingestMutation.mutateAsync(book);
      console.log("Ingested book response:", ingestedBook);
      
      if (!ingestedBook?.id) {
        throw new Error("Ingest did not return book ID");
      }
      
      await addToShelfMutation.mutateAsync({
        bookId: ingestedBook.id,
        status: selectedStatus,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add book:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add book to shelf",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!existingUserBook) return;
    await updateStatusMutation.mutateAsync({
      userBookId: existingUserBook.id,
      status: selectedStatus,
    });
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

  const isPending = ingestMutation.isPending || addToShelfMutation.isPending || 
    updateStatusMutation.isPending || updateRatingMutation.isPending;

  // Build shelves list (default + enabled custom)
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

  const selectedShelfName = allShelves.find(s => s.slug === selectedStatus)?.name || "Reading";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0" data-testid="dialog-book-detail">
        {/* Cover and Title Section */}
        <div className="relative">
          {book.coverUrl ? (
            <div className="w-full aspect-[2/3] overflow-hidden">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover blur-xl opacity-40"
              />
            </div>
          ) : (
            <div className="w-full aspect-[2/3] bg-muted/40" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-end p-6 pb-4">
            {book.coverUrl && (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-32 h-48 object-cover rounded-lg shadow-2xl mb-4"
                data-testid="img-book-cover"
              />
            )}
            
            <h2 className="font-display text-xl font-bold text-center mb-1" data-testid="text-book-title">
              {book.title}
            </h2>
            <p className="text-sm text-muted-foreground text-center" data-testid="text-book-author">
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
                  data-testid="button-shelf-selector"
                >
                  <span className="truncate">{selectedShelfName}</span>
                  <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                {allShelves.map((shelf) => (
                  <DropdownMenuItem
                    key={shelf.slug}
                    onClick={() => {
                      setSelectedStatus(shelf.slug);
                      if (existingUserBook) {
                        updateStatusMutation.mutate({
                          userBookId: existingUserBook.id,
                          status: shelf.slug,
                        });
                      }
                    }}
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
                        disabled={updateRatingMutation.isPending}
                        data-testid="button-save-rating"
                      >
                        {updateRatingMutation.isPending ? "Saving..." : "Save"}
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

        {/* Action Button (only show for new books) */}
        {!existingUserBook && (
          <div className="px-6 pb-6">
            <Button
              onClick={handleAddToShelf}
              disabled={isPending}
              className="w-full"
              data-testid="button-add-to-shelf"
            >
              {isPending ? "Adding..." : "Add to Shelf"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
