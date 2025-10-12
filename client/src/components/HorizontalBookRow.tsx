import BookCard from "./BookCard";
import { ChevronRight } from "lucide-react";
import { type BookSearchResult } from "@/lib/api";

interface HorizontalBookRowProps {
  title: string;
  books: BookSearchResult[];
  onBookClick: (book: BookSearchResult) => void;
  onSeeAll?: () => void;
}

export default function HorizontalBookRow({ title, books, onBookClick, onSeeAll }: HorizontalBookRowProps) {
  if (books.length === 0) return null;

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
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
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
      </div>
    </section>
  );
}
