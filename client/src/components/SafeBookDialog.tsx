import { lazy, Suspense } from "react";
import type { BookSearchResult } from "@/lib/api";

const LazyBookDetailDialog = lazy(() => import("@/components/BookDetailDialog"));

interface Props {
  book: BookSearchResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import React from "react";

class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { fallback?: React.ReactNode; children?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(_err: any) { /* no-op */ }
  render() { return this.state.hasError ? (this.props.fallback ?? null) : this.props.children; }
}

function BasicModal({ book, open, onOpenChange }: Props) {
  if (!open || !book) return null;
  return (
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative z-10 w-[92vw] max-w-[26rem] max-h-[90vh] overflow-auto rounded-2xl border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {book.coverUrl && (
          <img src={book.coverUrl} alt={book.title} className="w-32 h-48 rounded-lg object-cover mx-auto mb-4" />
        )}
        <h2 className="font-display text-xl font-bold text-center mb-1">{book.title}</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">{book.authors.join(", ")}</p>
        {book.description && (
          <p className="text-sm text-foreground/90 leading-relaxed">
            {book.description}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SafeBookDialog({ book, open, onOpenChange }: Props) {
  if (!open) return null;
  // Fallback lightweight modal if the heavy dialog errors at runtime
  const fallback = <BasicModal book={book} open={open} onOpenChange={onOpenChange} />;
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LazyBookDetailDialog book={book} open={open} onOpenChange={onOpenChange} />
      </Suspense>
    </ErrorBoundary>
  );
}
