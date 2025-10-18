import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBookTaxonomy, ingestBook, type BookSearchResult } from "@/lib/api";
import { navigateToBrowseWithFilter } from "@/lib/browseFilter";

interface Props {
  book: BookSearchResult;
}

export default function BookTaxonomyChips({ book }: Props) {
  const queryClient = useQueryClient();
  const [showAllTags, setShowAllTags] = useState(false);
  const ingestAttemptedRef = useRef(false);

  const taxonomyQuery = useQuery({
    queryKey: ["/api/book-taxonomy", book.googleBooksId],
    queryFn: () => getBookTaxonomy(book.googleBooksId),
  });

  const ingestMutation = useMutation({ mutationFn: ingestBook });

  useEffect(() => {
    if (taxonomyQuery.data || ingestAttemptedRef.current) return;
    // Best-effort: attempt ingest, then refetch taxonomy
    (async () => {
      try {
        ingestAttemptedRef.current = true;
        await ingestMutation.mutateAsync(book);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/book-taxonomy", book.googleBooksId] });
        }, 50);
      } catch {
        // ignore
      }
    })();
  }, [book, taxonomyQuery.data, ingestMutation, queryClient]);

  const taxonomy = taxonomyQuery.data;
  if (!taxonomy || (!taxonomy.genre && !taxonomy.subgenre && taxonomy.tags.length === 0)) {
    return null;
  }

  return (
    <div className="px-6 py-4 border-b border-border/50">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tags</div>
          <div className="flex flex-wrap gap-2">
            {(showAllTags ? taxonomy.tags : taxonomy.tags.slice(0, 12)).map((t) => (
              <Badge
                key={t.slug}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => navigateToBrowseWithFilter({ kind: "tag", slug: t.slug, label: t.name })}
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
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Genres</div>
          <div className="flex flex-wrap gap-2">
            {taxonomy.genre && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => navigateToBrowseWithFilter({ kind: "genre", slug: taxonomy.genre.slug, label: taxonomy.genre.name })}
              >
                {taxonomy.genre.name}
              </Badge>
            )}
            {taxonomy.subgenre && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => navigateToBrowseWithFilter({ kind: "subgenre", slug: taxonomy.subgenre.slug, label: taxonomy.subgenre.name })}
              >
                {taxonomy.subgenre.name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

