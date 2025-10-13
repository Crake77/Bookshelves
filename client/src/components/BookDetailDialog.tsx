import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type BookSearchResult } from "@/lib/api";

interface BookDetailDialogProps {
  book: BookSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookDetailDialog({ book, open, onOpenChange }: BookDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {book?.title ?? "Untitled"}
          </DialogTitle>
        </DialogHeader>

        {book ? (
          <div className="space-y-4">
            <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title ?? "Book cover"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No cover available
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Author</h3>
                <p className="text-base">{book.author ?? "Unknown author"}</p>
              </div>

              {book.year && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">First Published</h3>
                  <p className="text-base">{book.year}</p>
                </div>
              )}

              <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                These results are powered by the Open Library catalog. Add books you love by
                tapping the search results and saving them to your own lists.
              </div>
            </div>

            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Select a book to see details.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
