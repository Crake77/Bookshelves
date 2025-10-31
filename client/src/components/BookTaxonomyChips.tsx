import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBookTaxonomy, ingestBook, type BookSearchResult } from "@/lib/api";
import type { TaxonomyFilter } from "@/components/TaxonomyListDialog";

interface Props {
  book: BookSearchResult;
  hint?: { kind: "tag" | "subgenre"; slug: string; label: string };
  onOpenFilter?: (filter: TaxonomyFilter) => void;
}

type FilterKind = TaxonomyFilter["kind"];

export default function BookTaxonomyChips({ book, hint, onOpenFilter }: Props) {
  const queryClient = useQueryClient();
  const [showAllTags, setShowAllTags] = useState(false);
  const ingestAttemptedRef = useRef(false);
  const attachAttemptedRef = useRef(false);
  const seededRef = useRef(false);

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

  // DISABLED: Auto-ingestion disabled while validating batch 001-003 data
  // Taxonomy is already seeded and books already have taxonomy links
  // useEffect(() => {
  //   if (ingestAttemptedRef.current) return;
  //   const tax = taxonomyQuery.data;
  //   const needsIngest = !tax || ((!tax.genre && !tax.subgenre) && ((tax.tags?.length ?? 0) === 0));
  //   if (!needsIngest) return;
  //   ...
  // }, [book, taxonomyQuery.data, ingestMutation, queryClient]);

  // DISABLED: Auto-attach disabled while validating batch 001-003 data
  // Second pass taxonomy inference disabled
  // useEffect(() => {
  //   ...
  // }, [book, taxonomyQuery.data, ingestMutation, queryClient]);

  const taxonomy = taxonomyQuery.data;
  
  // If loading, show nothing (Suspense fallback handles this)
  if (taxonomyQuery.isLoading) {
    return null;
  }
  
  // If we have data but it's empty, just show "No taxonomy" message
  // Auto-ingestion disabled during batch validation
  if (!taxonomy || (!taxonomy.genre && !taxonomy.subgenre && (!taxonomy.tags || taxonomy.tags.length === 0))) {
    return (
      <div className="px-6 py-4 border-b border-border/50">
        <div className="text-xs text-muted-foreground">No taxonomy data available for this book.</div>
      </div>
    );
  }

  const openDialog = (kind: FilterKind, slug?: string | null, label?: string | null) => {
    if (!onOpenFilter || !slug) return;
    onOpenFilter({ kind, slug, label: label ?? slug });
  };

  // Separate regular tags from content warnings
  const contentWarnings = taxonomy.tags.filter(t => 
    t.group === 'content_warnings' || t.group === 'content_flags'
  );
  const regularTags = taxonomy.tags.filter(t => 
    t.group !== 'content_warnings' && t.group !== 'content_flags'
  );

  const slugify = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const normalizeChip = (value: any) => {
    if (!value) return undefined;
    if (typeof value === "string") {
      const slug = slugify(value);
      return { slug: slug.length > 0 ? slug : value, name: value };
    }
    if (typeof value === "object" && value.slug && value.name) {
      return value;
    }
    return undefined;
  };

  const format = normalizeChip(taxonomy.format);
  const ageMarket = normalizeChip(taxonomy.ageMarket);
  const audience = normalizeChip(taxonomy.audience) ?? ageMarket;

  return (
    <div className="px-6 py-4 border-b border-border/50" data-testid="taxonomy-chips">
      <div className="flex items-start gap-4">
        {/* Left side: Tags and Content Warnings */}
        <div className="flex-1 space-y-4">
          {/* Regular Tags */}
          {regularTags.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2" data-testid="taxonomy-tags">Tags</div>
              <div className="flex flex-wrap gap-2">
                {(showAllTags ? regularTags : regularTags.slice(0, 12)).map((t) => (
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
              {regularTags.length > 12 && (
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAllTags((v) => !v)}>
                    {showAllTags ? "Show Less" : `Show All ${regularTags.length} Tags`}
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Content Warnings */}
          {contentWarnings.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Content Warnings</div>
              <div className="flex flex-wrap gap-2">
                {contentWarnings.map((t) => (
                  <Badge
                    key={t.slug}
                    variant="secondary"
                    className="cursor-pointer bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/30"
                    onClick={() => openDialog("tag", t.slug, t.name)}
                    data-testid={`chip-warning-${t.slug}`}
                  >
                    #{t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right side: Genres, Subgenres, Format, Audience, Published Date */}
        <div className="w-40 flex-shrink-0 space-y-4">
          {/* Genre */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2" data-testid="taxonomy-genres">Genre</div>
            {taxonomy.genre ? (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => openDialog("genre", taxonomy.genre!.slug, taxonomy.genre!.name)}
                  data-testid={`chip-genre-${taxonomy.genre.slug}`}
                >
                  {taxonomy.genre.name}
                </Badge>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
          
          {/* Subgenre */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Subgenre</div>
            {taxonomy.subgenre ? (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => openDialog("subgenre", taxonomy.subgenre!.slug, taxonomy.subgenre!.name)}
                  data-testid={`chip-subgenre-${taxonomy.subgenre.slug}`}
                >
                  {taxonomy.subgenre.name}
                </Badge>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
          
          {/* Format */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Format</div>
            {format ? (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => openDialog("format", format.slug, format.name)}
                  data-testid="chip-format"
                >
                  {format.name}
                </Badge>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
          
          {/* Audience (Age Market) */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Audience</div>
            {audience ? (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => openDialog("audience", audience.slug, audience.name)}
                  data-testid="chip-audience"
                >
                  {audience.name}
                </Badge>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
          
          {/* Published Date */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Published</div>
            {book.publishedDate ? (
              <div className="text-sm text-foreground">
                {new Date(book.publishedDate).getFullYear()}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
