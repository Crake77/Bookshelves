import { useMemo } from "react";
import BookCard from "./BookCard";
import { ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { type BookSearchResult } from "@/lib/api";

interface HorizontalBookRowProps {
  title: string;
  books: BookSearchResult[];
  onBookClick: (book: BookSearchResult) => void;
  onSeeAll?: () => void;
  isLoading?: boolean;
  subtitle?: string;
}

export default function HorizontalBookRow({
  title,
  books,
  onBookClick,
  onSeeAll,
  isLoading = false,
  subtitle,
}: HorizontalBookRowProps) {
  const safeBooks = useMemo(
    () =>
      books.filter((book): book is BookSearchResult =>
        Boolean(book?.googleBooksId && book?.title)
      ),
    [books]
  );

  if (!isLoading && safeBooks.length === 0) return null;

  const skeletonItems = Array.from({ length: 6 });

  const sectionId = `section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <section className="mb-8" data-testid={sectionId}>
      <div className="flex items-center justify-between mb-3 px-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
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

      <div className="relative">
        <Carousel
          opts={{ align: "start", dragFree: true }}
          className="px-4"
        >
          <CarouselContent className="-ml-3">
            {isLoading
              ? skeletonItems.map((_, index) => (
                  <CarouselItem key={index} className="basis-auto pl-3">
                    <div className="w-32 space-y-2">
                      <Skeleton className="h-48 w-full rounded-lg" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CarouselItem>
                ))
              : safeBooks.map((book) => (
                  <CarouselItem
                    key={book.googleBooksId}
                    className="basis-auto pl-3"
                    data-testid={`book-card-${book.googleBooksId}`}
                  >
                    <div className="w-32">
                      <BookCard
                        title={book.title}
                        author={book.authors?.[0] ?? "Unknown author"}
                        coverUrl={book.coverUrl}
                        onClick={() => onBookClick(book)}
                      />
                    </div>
                  </CarouselItem>
                ))}
          </CarouselContent>
          <CarouselPrevious
            className="hidden sm:flex left-3 top-1/2 -translate-y-1/2 border border-border bg-background/90 text-foreground shadow-md"
            aria-label={`Scroll ${title} left`}
          />
          <CarouselNext
            className="hidden sm:flex right-3 top-1/2 -translate-y-1/2 border border-border bg-background/90 text-foreground shadow-md"
            aria-label={`Scroll ${title} right`}
          />
        </Carousel>

        <div className="pointer-events-none absolute inset-y-4 left-4 w-10 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-y-4 right-4 w-10 bg-gradient-to-l from-background via-background/70 to-transparent" />
      </div>
    </section>
  );
}
