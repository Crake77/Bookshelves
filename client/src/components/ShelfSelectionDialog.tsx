import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShelfSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookTitle: string;
}

export default function ShelfSelectionDialog({ open, onOpenChange, bookTitle }: ShelfSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-shelf-selection">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl">Save to a shelf</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm text-muted-foreground">
          <p>
            Shelf management is not yet connected to your Neon database in this preview build.
            We're focusing on making browsing and search lightning fast on Vercel.
          </p>
          <p>
            In the meantime, jot down <strong>{bookTitle}</strong> in your reading list so you can come back to it later.
          </p>
        </div>

        <Button className="w-full" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
