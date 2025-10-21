import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBookTaxonomy, ingestBook, type BookSearchResult } from "@/lib/api";
import { detectTaxonomy, detectAgeMarketSlug } from "../../../shared/taxonomy";
import TaxonomyListDialog from "@/components/TaxonomyListDialog";

interface Props {
  book: BookSearchResult;
  hint?: { kind: "tag" | "subgenre"; slug: string; label: string };
}

export default function BookTaxonomyChips({ book, hint }: Props) {
  const queryClient = useQueryClient();
  const [showAllTags, setShowAllTags] = useState(false);
  const ingestAttemptedRef = useRef(false);
  const attachAttemptedRef = useRef(false);
  const seededRef = useRef(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<{
    kind: "genre" | "subgenre" | "tag";
    slug: string;
    label: string;
  } | null>(null);

  const taxonomyQuery = useQuery({
    queryKey: ["/api/book-taxonomy", book.googleBooksId],
    queryFn: () => getBookTaxonomy(book.googleBooksId),
  });

  const ingestMutation = useMutation({ mutationFn: ingestBook });

  async function seedTaxonomyIfNeeded() {
    if (seededRef.current) return;
    try {
      await fetch("/api/taxonomy-seed", { method: "POST" });
      seededRef.current = true;
    } catch {
      // ignore — best effort
    }
  }

  // Reset ingest attempt whenever the book changes
  useEffect(() => {
    ingestAttemptedRef.current = false;
    attachAttemptedRef.current = false;
  }, [book.googleBooksId]);

  useEffect(() => {
    if (ingestAttemptedRef.current) return;
    const tax = taxonomyQuery.data;
    const needsIngest = !tax || ((!tax.genre && !tax.subgenre) && ((tax.tags?.length ?? 0) === 0));
    if (!needsIngest) return;
    // Best-effort: attempt ingest, then refetch taxonomy
    (async () => {
      try {
        // Ensure taxonomy master data exists in DB (idempotent)
        await seedTaxonomyIfNeeded();
        ingestAttemptedRef.current = true;
        await ingestMutation.mutateAsync(book);
        // Attach inferred age market if available
        try {
          const age = detectAgeMarketSlug(book.title, book.description, book.categories);
          if (age) {
            await fetch("/api/book-taxonomy", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ googleBooksId: book.googleBooksId, ageMarketSlug: age }),
            });
          }
        } catch {}
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/book-taxonomy", book.googleBooksId] });
        }, 100);
      } catch {
        // ignore
      }
    })();
  }, [book, taxonomyQuery.data, ingestMutation, queryClient]);

  // Second pass: if taxonomy still empty after ingest, infer and attach best-effort
  useEffect(() => {
    const tax = taxonomyQuery.data;
    if (!tax || attachAttemptedRef.current) return;
    const isEmpty = (!tax.genre && !tax.subgenre) && ((tax.tags?.length ?? 0) === 0);
    if (!isEmpty) return;
    // Best-effort client inference and server attach
    (async () => {
      try {
        attachAttemptedRef.current = true;
        await seedTaxonomyIfNeeded();
        // Ensure book exists in DB
        await ingestMutation.mutateAsync(book);
        const inferred = detectTaxonomy(book.title, book.description, book.categories);
        const attachCalls: Promise<any>[] = [];
        if (inferred.primarySubgenre) {
          attachCalls.push(fetch("/api/book-taxonomy", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ googleBooksId: book.googleBooksId, subgenreSlug: inferred.primarySubgenre }),
          }));
        }
        for (const slug of (inferred.crossTags ?? []).slice(0, 12)) {
          attachCalls.push(fetch("/api/book-taxonomy", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ googleBooksId: book.googleBooksId, tagSlug: slug }),
          }));
        }
        if (attachCalls.length > 0) {
          await Promise.allSettled(attachCalls);
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/book-taxonomy", book.googleBooksId] });
          }, 150);
        }
      } catch {
        // ignore
      }
    })();
  }, [book, taxonomyQuery.data, ingestMutation, queryClient]);

  const taxonomy = taxonomyQuery.data;
  if (!taxonomy || (!taxonomy.genre && !taxonomy.subgenre && taxonomy.tags.length === 0)) {
    // If we have a hint (e.g., from a tag or subgenre popup), attach it server-side once
    if (hint && !ingestAttemptedRef.current) {
      ingestAttemptedRef.current = true;
      (async () => {
        try {
        // Ensure the taxonomy schema/data exists and the book exists in DB first
        await seedTaxonomyIfNeeded();
        // Ensure the book exists in DB first
        await ingestMutation.mutateAsync(book);
        // Attach age market if detectable
        try {
          const age = detectAgeMarketSlug(book.title, book.description, book.categories);
          if (age) {
            await fetch("/api/book-taxonomy", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ googleBooksId: book.googleBooksId, ageMarketSlug: age }),
            });
          }
        } catch {}
        // Attach taxonomy hint
        await fetch("/api/book-taxonomy", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ googleBooksId: book.googleBooksId, tagSlug: hint.kind === "tag" ? hint.slug : undefined, subgenreSlug: hint.kind === "subgenre" ? hint.slug : undefined }),
        });
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/book-taxonomy", book.googleBooksId] });
          }, 120);
        } catch {
          // ignore
        }
      })();
    }
    return null;
  }

  const openDialog = (kind: "genre" | "subgenre" | "tag", slug: string, label: string) => {
    setDialogFilter({ kind, slug, label });
    setDialogOpen(true);
  };

  return (
    <div className="px-6 py-4 border-b border-border/50" data-testid="taxonomy-chips">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2" data-testid="taxonomy-tags">Tags</div>
          <div className="flex flex-wrap gap-2">
            {(showAllTags ? taxonomy.tags : taxonomy.tags.slice(0, 12)).map((t) => (
              <Badge
                key={t.slug}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => openDialog("tag", t.slug, t.name)}
                data-testid={`chip-tag-${t.slug}`}
              >
                #{t.name}
              </Badge>
            ))}
          </div>
          {taxonomy.tags.length > 12 && (
            <div className="mt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAllTags((v) => !v)}>
                {showAllTags ? "Show Less" : `Show All ${taxonomy.allTagCount || taxonomy.tags.length} Tags`}
              </Button>
            </div>
          )}
        </div>
        <div className="w-40 flex-shrink-0">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2" data-testid="taxonomy-genres">Genres</div>
          <div className="flex flex-wrap gap-2">
            {(() => { const g = taxonomy.genre; return g ? (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => openDialog("genre", g.slug, g.name)}
                data-testid={`chip-genre-${g.slug}`}
              >
                {g.name}
              </Badge>
            ) : null })()}
            {(() => { const sg = taxonomy.subgenre; return sg ? (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => openDialog("subgenre", sg.slug, sg.name)}
                data-testid={`chip-subgenre-${sg.slug}`}
              >
                {sg.name}
              </Badge>
            ) : null })()}
          </div>
        </div>
        {/* Inline dialog for taxonomy browsing */}
        <TaxonomyListDialog open={dialogOpen} onOpenChange={setDialogOpen} filter={dialogFilter} />
      </div>
    </div>
  );
}
