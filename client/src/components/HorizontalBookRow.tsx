import type { UIEvent } from "react";
import BookCard from "./BookCard";
import { ChevronRight } from "lucide-react";
import { type BookSearchResult } from "@/lib/api";

interface HorizontalBookRowProps {
  title: string;
  titleSuffix?: string;
  secondaryChips?: string[];
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
              className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80 hover:bg-muted/80"
              data-testid={`button-edit-${title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              + Subgenre / Tags
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
          {secondaryChips.map((chip, idx) => (
            <span key={`${chip}-${idx}`} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80">{chip}</span>
          ))}
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
