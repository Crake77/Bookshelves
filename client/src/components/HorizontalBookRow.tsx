import type { UIEvent } from "react";
import BookCard from "./BookCard";
import { ChevronRight } from "lucide-react";
import { type BookSearchResult } from "@/lib/api";

interface HorizontalBookRowProps {
  title: string;
  books: BookSearchResult[];
  onBookClick: (book: BookSearchResult) => void;
  onSeeAll?: () => void;
  onEndReached?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

export default function HorizontalBookRow({
  title,
  books,
  onBookClick,
  onSeeAll,
  onEndReached,
  isLoadingMore = false,
  hasMore = true,
}: HorizontalBookRowProps) {
  if (books.length === 0) return null;

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!onEndReached || isLoadingMore || !hasMore) {
      return;
    }

    const target = event.currentTarget;
    const distanceFromEnd =
      target.scrollWidth - target.scrollLeft - target.clientWidth;

    if (distanceFromEnd < 120) {
      onEndReached();
    }
  };

  return (
    <section className="mb-6" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
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
      <div
        className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide"
        onScroll={handleScroll}
      >
        {books.map((book) => (
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
        {isLoadingMore && (
          <div className="w-32 flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
      </div>
    </section>
  );
}
