/**
 * Book Series Metadata Component
 * 
 * Displays series name and position (if applicable) with clickable filters.
 * - Series name click → shows all books in series
 * - Series position click → shows only main sequence books (excludes prequels/add-ons)
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BookSeriesMetadataProps {
  series: string;
  seriesOrder: number | null;
  totalBooksInSeries: number | null;
  onSeriesClick: () => void;
  onPositionClick: () => void;
}

export default function BookSeriesMetadata({
  series,
  seriesOrder,
  totalBooksInSeries,
  onSeriesClick,
  onPositionClick,
}: BookSeriesMetadataProps) {
  const hasPosition = seriesOrder !== null && totalBooksInSeries !== null;
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs text-muted-foreground">Series:</span>
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={onSeriesClick}
      >
        {series}
      </Badge>
      {hasPosition && (
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={onPositionClick}
        >
          Book {seriesOrder} of {totalBooksInSeries}
        </Badge>
      )}
    </div>
  );
}

