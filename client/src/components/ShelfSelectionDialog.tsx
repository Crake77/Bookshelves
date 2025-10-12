import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCustomShelves, updateBookStatus, removeBookFromShelf, DEMO_USER_ID, type UserBook } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Trash2, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShelfOption {
  slug: string;
  name: string;
  isDefault: boolean;
}

interface ShelfSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBook: UserBook | null;
  bookTitle: string;
}

const DEFAULT_SHELVES: ShelfOption[] = [
  { slug: "reading", name: "Reading", isDefault: true },
  { slug: "completed", name: "Completed", isDefault: true },
  { slug: "plan-to-read", name: "Plan to Read", isDefault: true },
  { slug: "on-hold", name: "On Hold", isDefault: true },
  { slug: "dropped", name: "Dropped", isDefault: true },
];

export default function ShelfSelectionDialog({
  open,
  onOpenChange,
  userBook,
  bookTitle,
}: ShelfSelectionDialogProps) {
  const { toast } = useToast();
  const [selectedShelf, setSelectedShelf] = useState<string>(userBook?.status || "");

  // Fetch custom shelves
  const { data: customShelves = [] } = useQuery({
    queryKey: ["/api/custom-shelves", DEMO_USER_ID],
    queryFn: () => getCustomShelves(DEMO_USER_ID),
    enabled: open,
  });

  // Combine default and custom shelves, filter for enabled ones
  const allShelves: ShelfOption[] = [
    ...DEFAULT_SHELVES,
    ...customShelves
      .filter(shelf => shelf.isEnabled === 1)
      .map(shelf => ({
        slug: shelf.slug,
        name: shelf.name,
        isDefault: false,
      }))
  ];

  // Update status mutation
  const updateMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!userBook) throw new Error("No user book selected");
      return updateBookStatus(userBook.id, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-books"] });
      toast({
        title: "Shelf updated",
        description: `"${bookTitle}" moved to ${allShelves.find(s => s.slug === selectedShelf)?.name}`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update shelf",
        variant: "destructive",
      });
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!userBook) throw new Error("No user book selected");
      return removeBookFromShelf(userBook.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-books"] });
      toast({
        title: "Book removed",
        description: `"${bookTitle}" removed from all shelves`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove book",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = () => {
    if (selectedShelf && selectedShelf !== userBook?.status) {
      updateMutation.mutate(selectedShelf);
    } else {
      onOpenChange(false);
    }
  };

  const handleRemove = () => {
    removeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-shelf-selection">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl">Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {allShelves.map((shelf) => (
            <button
              key={shelf.slug}
              onClick={() => setSelectedShelf(shelf.slug)}
              className={`w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-colors ${
                selectedShelf === shelf.slug
                  ? "bg-primary/20 text-primary font-medium"
                  : "text-foreground/70 hover-elevate"
              }`}
              data-testid={`option-shelf-${shelf.slug}`}
            >
              <span>{shelf.name}</span>
              {selectedShelf === shelf.slug && (
                <Check className="w-5 h-5" data-testid="icon-selected" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <Button
            className="w-full"
            onClick={handleUpdate}
            disabled={updateMutation.isPending || !selectedShelf}
            data-testid="button-update-shelf"
          >
            {updateMutation.isPending ? "Updating..." : "Update"}
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleRemove}
            disabled={removeMutation.isPending}
            data-testid="button-remove-from-shelves"
          >
            {removeMutation.isPending ? (
              "Removing..."
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove From Shelves
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
