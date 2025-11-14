import type { UIEvent } from "react";
import BookCard from "./BookCard";
import { ChevronRight, Edit3 } from "lucide-react";
import { type BookSearchResult } from "@/lib/api";

export type ChipVariant = "tag" | "content-flag" | "blocked";
export type SecondaryChip = string | { label: string; type?: ChipVariant };

interface HorizontalBookRowProps {
  title: string;
  titleSuffix?: string;
  secondaryChips?: SecondaryChip[];
  books: BookSearchResult[];
  onBookClick: (book: BookSearchResult) => void;
  onSeeAll?: () => void;
  onEdit?: () => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  isInitialLoading?: boolean;
  errorMessage?: string | null;
  skeletonCount?: number;
  emptyMessage?: string;
}

const SCROLL_LOAD_BUFFER = 320;

export default function HorizontalBookRow({
  title,
  titleSuffix,
  secondaryChips,
  books,
  onBookClick,
  onSeeAll,
  onEdit,
  onEndReached,
  isLoadingMore = false,
  hasMore = true,
  isInitialLoading = false,
  errorMessage = null,
  skeletonCount = 8,
  emptyMessage,
}: HorizontalBookRowProps) {
  const showSkeletons = isInitialLoading && books.length === 0;
  const showEmptyState = !isInitialLoading && books.length === 0;

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!onEndReached || isLoadingMore || !hasMore) {
      return;
    }

    const target = event.currentTarget;
    const distanceFromEnd =
      target.scrollWidth - target.scrollLeft - target.clientWidth;

    if (distanceFromEnd <= SCROLL_LOAD_BUFFER) {
      onEndReached();
    }
  };

  return (
    <section className="mb-6" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-2 px-4">
        <div className="flex items-center gap-3">
          {titleSuffix ? (
            <h2 className="font-display text-lg">
              <span className="font-semibold">{title}</span>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="text-primary">{titleSuffix}</span>
            </h2>
          ) : (
            <h2 className="font-display text-lg font-semibold">{title}</h2>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors"
              data-testid={`button-edit-${title.toLowerCase().replace(/\s+/g, '-')}`}
              aria-label="Edit filters"
            >
              <Edit3 className="h-3.5 w-3.5 text-primary" />
            </button>
          )}
        </div>
        <div>
          {onSeeAll && (
            <button 
              onClick={onSeeAll}
              className="text-sm text-primary flex items-center gap-1 hover-elevate px-2 py-1 rounded"
              data-testid={`button-see-all-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {Array.isArray(secondaryChips) && secondaryChips.length > 0 && (
        <div className="px-4 mb-2 flex flex-wrap gap-2">
          {secondaryChips.map((chip, idx) => {
            const chipData =
              typeof chip === "string"
                ? { label: chip, type: "tag" as ChipVariant }
                : { label: chip.label, type: chip.type ?? "tag" };
            const { label, type } = chipData;

            const chipClasses = type === "blocked"
              ? 'text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground line-through'
              : type === "content-flag"
              ? 'text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300'
              : 'text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80';
            
            return (
              <span key={`${label}-${idx}`} className={chipClasses}>
                {label}
              </span>
            );
          })}
        </div>
      )}
      {errorMessage && (
        <div className="px-4 pb-2 text-xs text-destructive">{errorMessage}</div>
      )}
      <div
        className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide"
        onScroll={handleScroll}
      >
        {showSkeletons &&
          Array.from({ length: skeletonCount }).map((_, index) => (
            <div key={`skeleton-${index}`} className="w-32 flex-shrink-0 animate-pulse">
              <div className="w-full h-48 rounded-lg bg-muted" />
              <div className="mt-2 h-4 bg-muted rounded" />
              <div className="mt-1 h-3 bg-muted rounded" />
            </div>
          ))}
        {!showSkeletons && books.map((book) => (
          <div 
            key={book.googleBooksId} 
            className="w-32 flex-shrink-0"
            data-testid={`book-card-${book.googleBooksId}`}
          >
            <BookCard
              bookId={book.googleBooksId}
              title={book.title}
              author={book.authors[0]}
              coverUrl={book.coverUrl}
              onClick={() => onBookClick(book)}
            />
          </div>
        ))}
        {showEmptyState && !errorMessage && (
          <div className="w-full max-w-xs text-sm text-muted-foreground py-6">
            {emptyMessage ?? "No books to show yet. Try another filter or check back soon."}
          </div>
        )}
        {isLoadingMore && (
          <div className="w-32 flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
      </div>
    </section>
  );
}
