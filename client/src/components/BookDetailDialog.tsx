import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ingestBook, addBookToShelf, getCustomShelves, DEMO_USER_ID, type BookSearchResult } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface BookDetailDialogProps {
  book: BookSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookDetailDialog({ book, open, onOpenChange }: BookDetailDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("reading");
  const { toast } = useToast();

  // Fetch custom shelves
  const { data: customShelves = [] } = useQuery({
    queryKey: ["/api/custom-shelves", DEMO_USER_ID],
    queryFn: () => getCustomShelves(DEMO_USER_ID),
    enabled: open,
  });

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
        description: `"${book?.title}" has been added to your ${selectedStatus} shelf.`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add book to shelf",
        variant: "destructive",
      });
    },
  });

  const handleAddToShelf = async () => {
    if (!book) return;

    try {
      // First, ingest the book to get the database ID
      const ingestedBook = await ingestMutation.mutateAsync(book);
      
      // Then add it to the user's shelf
      await addToShelfMutation.mutateAsync({
        bookId: ingestedBook.id,
        status: selectedStatus,
      });
    } catch (error) {
      console.error("Failed to add book:", error);
    }
  };

  if (!book) return null;

  const isPending = ingestMutation.isPending || addToShelfMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-book-detail">
        <DialogHeader>
          <DialogTitle className="sr-only">Book Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-4">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-24 h-36 object-cover rounded-lg"
                data-testid="img-book-cover"
              />
            ) : (
              <div className="w-24 h-36 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No cover</span>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg font-semibold mb-1 line-clamp-2" data-testid="text-book-title">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-2" data-testid="text-book-author">
                {book.authors.join(", ")}
              </p>
              {book.publishedDate && (
                <p className="text-xs text-muted-foreground">
                  Published: {book.publishedDate}
                </p>
              )}
              {book.pageCount && (
                <p className="text-xs text-muted-foreground">
                  {book.pageCount} pages
                </p>
              )}
            </div>
          </div>

          {book.description && (
            <div>
              <p className="text-sm text-muted-foreground line-clamp-4" data-testid="text-book-description">
                {book.description}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Add to Shelf</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-shelf-status">
                  <SelectValue placeholder="Select a shelf" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="plan-to-read">Plan to Read</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  {customShelves
                    .filter(shelf => shelf.isEnabled === 1)
                    .map(shelf => (
                      <SelectItem key={shelf.id} value={shelf.slug}>
                        {shelf.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddToShelf}
              disabled={isPending}
              className="w-full"
              data-testid="button-add-to-shelf"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to Shelf"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
