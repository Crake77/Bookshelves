import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCustomShelves, updateBookStatus, DEMO_USER_ID, type UserBook } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Trash2, Check } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);

  // Sync selected shelf with current userBook when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedShelf(userBook?.status ?? null);
    } else {
      setSelectedShelf(null);
    }
  }, [open, userBook?.status]);

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

  const getShelfName = (slug: string | null): string => {
    if (!slug) return "Select Shelf";
    return (
      allShelves.find((shelf) => shelf.slug === slug)?.name ??
      slug.replace(/-/g, " ")
    );
  };

  const currentStatus = userBook?.status ?? null;
  const hasExistingStatus = Boolean(currentStatus);
  const hasChanges = selectedShelf !== currentStatus;

  // Update status mutation
  const updateMutation = useMutation({
    mutationFn: async (newStatus: string | null) => {
      if (!userBook) throw new Error("No user book selected");
      return updateBookStatus(userBook.id, newStatus);
    },
    onSuccess: (updated) => {
      setSelectedShelf(updated.status ?? null);
      queryClient.invalidateQueries({ queryKey: ["/api/user-books", DEMO_USER_ID] });
      const shelfName = getShelfName(updated.status ?? null);
      toast({
        title: updated.status ? "Shelf updated" : "Removed from shelves",
        description: updated.status
          ? `"${bookTitle}" moved to ${shelfName}`
          : `"${bookTitle}" removed from your shelves`,
        variant: updated.status ? "default" : "destructive",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update shelf",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = () => {
    const currentStatus = userBook?.status ?? null;
    if (selectedShelf === currentStatus) {
      onOpenChange(false);
      return;
    }
    updateMutation.mutate(selectedShelf ?? null);
  };

  const handleRemove = () => {
    setSelectedShelf(null);
    updateMutation.mutate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-shelf-selection">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl">Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <button
            key="__select"
            onClick={() => setSelectedShelf(null)}
            className={`w-full px-4 py-3 rounded-lg text-left flex items-center justify-between transition-colors ${
              selectedShelf === null
                ? "bg-primary/20 text-primary font-medium"
                : hasExistingStatus
                  ? "text-destructive hover:text-destructive"
                  : "text-foreground/70 hover-elevate"
            }`}
            data-testid="option-shelf-none"
          >
            <span>{hasExistingStatus ? "Remove" : "Select Shelf"}</span>
            {selectedShelf === null && (
              <Check className="w-5 h-5" data-testid="icon-selected" />
            )}
          </button>

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
            disabled={updateMutation.isPending || !hasChanges}
            data-testid="button-update-shelf"
          >
            {updateMutation.isPending ? "Updating..." : "Update"}
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleRemove}
            disabled={updateMutation.isPending || !hasExistingStatus}
            data-testid="button-remove-from-shelves"
          >
            {updateMutation.isPending ? (
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
