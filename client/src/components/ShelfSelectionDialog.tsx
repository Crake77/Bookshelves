import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateBookStatus, DEMO_USER_ID, type UserBook } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Trash2, Check } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useShelfPreferences } from "@/hooks/usePreferences";

interface ShelfSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBook: UserBook | null;
  bookTitle: string;
}

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

  const shelfPreferences = useShelfPreferences();
  const enabledShelves = useMemo(
    () => shelfPreferences.filter((shelf) => shelf.isEnabled),
    [shelfPreferences]
  );

  const allShelves = useMemo(() => {
    const base = enabledShelves.map((shelf) => ({ slug: shelf.slug, name: shelf.name }));
    if (selectedShelf && !base.some((shelf) => shelf.slug === selectedShelf)) {
      const existing = shelfPreferences.find((shelf) => shelf.slug === selectedShelf);
      if (existing) {
        return [...base, { slug: existing.slug, name: existing.name }];
      }
      return [...base, { slug: selectedShelf, name: selectedShelf.replace(/-/g, " ") }];
    }
    return base;
  }, [enabledShelves, selectedShelf, shelfPreferences]);

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

  // Update status mutation with optimistic UI
  const updateMutation = useMutation({
    mutationFn: async (newStatus: string | null) => {
      if (!userBook) throw new Error("No user book selected");
      return updateBookStatus(userBook.id, newStatus);
    },
    onSuccess: (updated) => {
      const queryKey = ["/api/user-books", DEMO_USER_ID] as const;
      queryClient.setQueryData(
        queryKey,
        (current: (UserBook & { book: any })[] | undefined) =>
          current
            ? current.map((ub) =>
                ub.id === (userBook?.id ?? updated.id) ? { ...ub, status: updated.status ?? null } : ub
              )
            : current
      );
      setSelectedShelf(updated.status ?? null);
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
    onMutate: async (newStatus) => {
      const queryKey = ["/api/user-books", DEMO_USER_ID] as const;
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData(queryKey) as (UserBook & { book: any })[] | undefined;

      if (previous && userBook) {
        queryClient.setQueryData(
          queryKey,
          previous.map((ub) => (ub.id === userBook.id ? { ...ub, status: newStatus } : ub))
        );
      }

      return { previous };
    },
    onError: (_error, _newStatus, context) => {
      const queryKey = ["/api/user-books", DEMO_USER_ID] as const;
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
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
