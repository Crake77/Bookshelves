/**
 * Cover Carousel Dialog
 *
 * Scroll-based carousel for selecting book cover editions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import type { Edition } from "@/lib/api";
import { clearCoverPreference, setCoverPreference } from "@/lib/cover-preferences";
import { cn } from "@/lib/utils";

// Format publication date for display
function formatPublicationDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleString("default", { month: "long" });
    const day = date.getDate();

    if (dateString.includes("-")) {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        return `${month} ${day}, ${year}`;
      } else if (parts.length === 2) {
        return `${month} ${year}`;
      }
    }
    return String(year);
  } catch {
    return dateString;
  }
}

const ISO3_TO_ISO2: Record<string, string> = {
  eng: "en",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  english: "en",
  fre: "fr",
  fra: "fr",
  fr: "fr",
  spa: "es",
  es: "es",
  ita: "it",
  it: "it",
  ger: "de",
  deu: "de",
  de: "de",
  por: "pt",
  pt: "pt",
  rus: "ru",
  ru: "ru",
  jpn: "ja",
  ja: "ja",
  chi: "zh",
  zho: "zh",
  zh: "zh",
};

const englishDisplayNames =
  typeof Intl !== "undefined" && typeof (Intl as any).DisplayNames !== "undefined"
    ? new (Intl as any).DisplayNames(["en"], { type: "language" })
    : null;

function formatLanguageLabel(language: string | null | undefined): string | null {
  if (!language) return null;
  const normalized = ISO3_TO_ISO2[language.toLowerCase()] ?? language.toLowerCase();
  if (englishDisplayNames) {
    try {
      return englishDisplayNames.of(normalized) ?? normalized.toUpperCase();
    } catch {
      // noop
    }
  }
  return normalized.toUpperCase();
}

function formatEditionLabel(format: string | null | undefined, language?: string | null): string | null {
  if (format && format !== "unknown") {
    const lower = format.toLowerCase();
    if (lower.includes("hardcover") || lower.includes("hardback") || lower.includes("cloth")) return "Hardcover";
    if (lower.includes("paperback") || lower.includes("softcover") || lower.includes("mass market"))
      return "Paperback";
    if (lower.includes("ebook") || lower.includes("digital")) return "Ebook";
    if (lower.includes("audio")) return "Audiobook";
    if (lower.includes("library binding")) return "Library binding";
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  const lang = formatLanguageLabel(language);
  return lang ? `${lang} edition` : null;
}

function buildPrimaryLabel(edition: Edition): string {
  const formatLabel = formatEditionLabel(edition.format, edition.language);
  const languageLabel = formatLanguageLabel(edition.language);
  const parts: string[] = [];
  if (formatLabel) parts.push(formatLabel);
  if (languageLabel && (!formatLabel || !formatLabel.toLowerCase().includes(languageLabel.toLowerCase()))) {
    parts.push(languageLabel);
  }
  if (parts.length === 0) return "Edition";
  return parts.join(" / ");
}

const ENGLISH_CODES = new Set(["en", "english", "en-us", "en-gb"]);

const SYNTHETIC_EDITION_ID = "__bookshelves-current-cover";

function isEnglishEdition(edition: Edition): boolean {
  if (edition.language && ENGLISH_CODES.has(edition.language.toLowerCase())) return true;
  if (edition.market) {
    const market = edition.market.toLowerCase();
    if (market.includes("us") || market.includes("uk") || market.includes("canada") || market.includes("australia")) {
      return true;
    }
  }
  if (edition.editionStatement && edition.editionStatement.toLowerCase().includes("english")) return true;
  return false;
}

function getPublicationTimestamp(edition: Edition): number {
  if (!edition.publicationDate) return 0;
  const date = new Date(edition.publicationDate);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortCoverEditions(editions: Edition[]): Edition[] {
  return [...editions].sort((a, b) => {
    const aEnglish = isEnglishEdition(a) ? 0 : 1;
    const bEnglish = isEnglishEdition(b) ? 0 : 1;
    if (aEnglish !== bEnglish) {
      return aEnglish - bEnglish;
    }

    const dateDiff = getPublicationTimestamp(b) - getPublicationTimestamp(a);
    if (dateDiff !== 0) {
      return dateDiff;
    }

    const aHasGoogle = Boolean(a.googleBooksId);
    const bHasGoogle = Boolean(b.googleBooksId);
    if (aHasGoogle !== bHasGoogle) {
      return aHasGoogle ? -1 : 1;
    }

    return (a.format || "").localeCompare(b.format || "");
  });
}

const EDITION_CHUNK_SIZE = 12;

interface CoverCarouselDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  editions: Edition[];
  fallbackCoverUrl?: string;
  selectedEditionId?: string;
  onSelect?: (editionId: string | null, coverUrl: string) => void;
  isLoading?: boolean;
}

export default function CoverCarouselDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  editions,
  fallbackCoverUrl,
  selectedEditionId,
  onSelect,
  isLoading = false,
}: CoverCarouselDialogProps) {
  const fitStorageKey = `bookshelves:cover-fit-mode:${bookId}`;
  const carouselRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<Array<HTMLDivElement | null>>([]);
  const pendingScrollIndex = useRef<number | null>(null);
  const hasSyntheticFallbackCover = useMemo(() => {
    if (!fallbackCoverUrl) return false;
    return !editions.some((edition) => edition.coverUrl === fallbackCoverUrl);
  }, [editions, fallbackCoverUrl]);

  const editionsWithFallback = useMemo(() => {
    if (!hasSyntheticFallbackCover || !fallbackCoverUrl) return editions;
    const syntheticEdition: Edition = {
      id: SYNTHETIC_EDITION_ID,
      coverUrl: fallbackCoverUrl,
      format: "default",
      publicationDate: null,
      editionStatement: "Default cover",
      googleBooksId: null,
      openLibraryId: null,
      isbn10: null,
      isbn13: null,
      language: null,
      market: null,
      pageCount: null,
      categories: [],
    };
    return [syntheticEdition, ...editions];
  }, [editions, hasSyntheticFallbackCover, fallbackCoverUrl]);

  const sortedEditions = useMemo(() => {
    const ordered = sortCoverEditions(editionsWithFallback);
    if (hasSyntheticFallbackCover) {
      const syntheticIndex = ordered.findIndex((edition) => edition.id === SYNTHETIC_EDITION_ID);
      if (syntheticIndex > 0) {
        const [syntheticEdition] = ordered.splice(syntheticIndex, 1);
        ordered.unshift(syntheticEdition);
      }
    }
    return ordered;
  }, [editionsWithFallback, hasSyntheticFallbackCover]);

  const [visibleCount, setVisibleCount] = useState(() => Math.min(EDITION_CHUNK_SIZE, sortedEditions.length));
  useEffect(() => {
    setVisibleCount(Math.min(EDITION_CHUNK_SIZE, sortedEditions.length));
  }, [sortedEditions.length]);

  const visibleEditions = useMemo(
    () => sortedEditions.slice(0, visibleCount),
    [sortedEditions, visibleCount],
  );

  useEffect(() => {
    slidesRef.current = [];
  }, [visibleEditions.length]);

  const [isFillMode, setIsFillMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(fitStorageKey) === "fill";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      setIsFillMode(window.localStorage.getItem(fitStorageKey) === "fill");
    } catch {
      setIsFillMode(false);
    }
  }, [open, fitStorageKey]);

  const emitFitChange = useCallback(
    (mode: "fill" | "fit") => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent("bookshelves:cover-fit-mode-changed", {
          detail: { bookId, mode },
        }),
      );
    },
    [bookId],
  );

  const handleToggleFit = useCallback(
    (checked: boolean) => {
      setIsFillMode(checked);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(fitStorageKey, checked ? "fill" : "fit");
        } catch {
          // ignore
        }
      }
      emitFitChange(checked ? "fill" : "fit");
    },
    [fitStorageKey, emitFitChange],
  );

  const [selectedIdInternal, setSelectedIdInternal] = useState<string | null>(() => {
    if (selectedEditionId) return selectedEditionId;
    if (hasSyntheticFallbackCover) return SYNTHETIC_EDITION_ID;
    return null;
  });
  useEffect(() => {
    if (selectedEditionId) {
      setSelectedIdInternal(selectedEditionId);
    } else if (hasSyntheticFallbackCover) {
      setSelectedIdInternal(SYNTHETIC_EDITION_ID);
    } else {
      setSelectedIdInternal(null);
    }
  }, [selectedEditionId, hasSyntheticFallbackCover]);

  useEffect(() => {
    if (!selectedIdInternal) return;
    const idx = sortedEditions.findIndex((edition) => edition.id === selectedIdInternal);
    if (idx >= 0 && idx >= visibleCount) {
      setVisibleCount((prev) =>
        Math.min(sortedEditions.length, Math.ceil((idx + 1) / EDITION_CHUNK_SIZE) * EDITION_CHUNK_SIZE),
      );
    }
  }, [selectedIdInternal, sortedEditions, visibleCount]);

  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const slide = slidesRef.current[index];
      if (slide) {
        slide.scrollIntoView({ behavior, inline: "center", block: "nearest" });
        setActiveIndex(index);
      }
    },
    [],
  );

  useEffect(() => {
    if (visibleCount < sortedEditions.length && activeIndex >= visibleCount - 2) {
      setVisibleCount((prev) => Math.min(prev + EDITION_CHUNK_SIZE, sortedEditions.length));
    }
  }, [activeIndex, visibleCount, sortedEditions.length]);

  useEffect(() => {
    if (!open || !selectedIdInternal) return;
    const idx = visibleEditions.findIndex((edition) => edition.id === selectedIdInternal);
    if (idx >= 0) {
      scrollToIndex(idx, "auto");
      setActiveIndex(idx);
    }
  }, [open, selectedIdInternal, visibleEditions, scrollToIndex]);

  useEffect(() => {
    if (pendingScrollIndex.current === null) return;
    const target = pendingScrollIndex.current;
    if (target < visibleEditions.length) {
      scrollToIndex(target);
      pendingScrollIndex.current = null;
    }
  }, [visibleEditions.length, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current || visibleEditions.length === 0) return;
    const containerCenter = carouselRef.current.scrollLeft + carouselRef.current.clientWidth / 2;
    let closestIndex = activeIndex;
    let minDistance = Infinity;
    visibleEditions.forEach((_, index) => {
      const slide = slidesRef.current[index];
      if (!slide) return;
      const slideCenter = slide.offsetLeft + slide.clientWidth / 2;
      const distance = Math.abs(slideCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  }, [visibleEditions, activeIndex]);

  const handleSelect = (edition: Edition) => {
    if (edition.id === SYNTHETIC_EDITION_ID) {
      clearCoverPreference(bookId);
      setSelectedIdInternal(SYNTHETIC_EDITION_ID);
      if (fallbackCoverUrl) {
        onSelect?.(null, fallbackCoverUrl);
      }
      onOpenChange(false);
      return;
    }
    if (!edition.coverUrl) return;
    setSelectedIdInternal(edition.id);
    setCoverPreference(bookId, edition.id, edition.coverUrl);
    onSelect?.(edition.id, edition.coverUrl);
    onOpenChange(false);
  };

  if (isLoading && sortedEditions.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-6 flex flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading cover editions…</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isLoading && visibleEditions.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-6">
          <h2 className="text-xl font-bold mb-2">No Editions Available</h2>
          <p className="text-sm text-muted-foreground">
            No additional cover editions are available for this book at this time.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const coverFrameClass = isFillMode ? "bg-background" : "bg-black";
  const coverImageClass = isFillMode ? "object-cover w-full h-full rounded-lg" : "object-contain";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header - Fixed at top, outside scroll area */}
        <div className="flex-shrink-0 z-20 bg-background border-b px-6 pt-6 pb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Select Cover Edition</h2>
            <p className="text-sm text-muted-foreground">{bookTitle}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span id="fit-toggle-label" className="text-muted-foreground whitespace-nowrap">
              Fit to card
            </span>
            <Switch
              aria-labelledby="fit-toggle-label"
              checked={isFillMode}
              onCheckedChange={handleToggleFit}
              aria-label="Toggle cover fit mode"
            />
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div
            data-testid="cover-scroll-container"
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-8"
            style={{ touchAction: "pan-x" }}
          >
            {visibleEditions.map((edition, index) => (
              <div
                key={edition.id}
                ref={(el) => {
                  slidesRef.current[index] = el;
                }}
                className={cn(
                  "flex-shrink-0 cursor-pointer transition-opacity",
                  "w-32 md:w-40 lg:w-48",
                  activeIndex === index ? "opacity-100" : "opacity-60",
                  selectedIdInternal === edition.id ? "ring-2 ring-primary rounded-lg" : "ring-0",
                )}
                onClick={() => handleSelect(edition)}
                data-testid={`cover-option-${edition.id}`}
              >
                <div className="relative group">
                  {edition.coverUrl ? (
                    <div
                      className={cn(
                        "w-full aspect-[2/3] rounded-lg flex items-center justify-center shadow-lg overflow-hidden",
                        coverFrameClass,
                      )}
                    >
                      <img
                        src={edition.coverUrl}
                        alt={`${bookTitle} - ${buildPrimaryLabel(edition)}`}
                        className={cn("max-w-full max-h-full", coverImageClass)}
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-lg bg-black flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No cover</span>
                    </div>
                  )}

                  {selectedIdInternal === edition.id && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md p-2 rounded-b-lg">
                    <div className="text-xs font-medium text-center">{buildPrimaryLabel(edition)}</div>
                    {edition.market && (
                      <div className="text-[11px] text-muted-foreground text-center mt-0.5">
                        {edition.market} edition
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 space-y-1 min-h-[3.5rem]">
                  {edition.editionStatement && (
                    <div className="text-xs text-muted-foreground text-center">{edition.editionStatement}</div>
                  )}
                  {edition.publicationDate && (
                    <div className="text-xs text-muted-foreground text-center">
                      Published {formatPublicationDate(edition.publicationDate)}
                    </div>
                  )}
                  {selectedIdInternal === edition.id && (
                    <div className="text-[11px] font-medium text-primary text-center">Selected</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer - Fixed at bottom, outside scroll area */}
        <div className="flex-shrink-0 px-6 pb-4 pt-2 text-center text-xs text-muted-foreground border-t bg-background">
          {visibleEditions.length > 0
            ? `${Math.min(activeIndex + 1, sortedEditions.length)} / ${sortedEditions.length}`
            : "0 / 0"}
        </div>
      </DialogContent>
    </Dialog>
  );
}
