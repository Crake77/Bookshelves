/**
 * Cover Carousel Dialog
 * 
 * GSAP-powered horizontal carousel for selecting book cover editions.
 * Based on Codrops GSAP carousel tutorial:
 * https://tympanus.net/codrops/2025/04/21/mastering-carousels-with-gsap-from-basics-to-advanced-animation/
 */

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { gsap } from "gsap";
import type { Edition } from "@/lib/api";
import { setCoverPreference } from "@/lib/cover-preferences";
import { cn } from "@/lib/utils";

// Format publication date for display
function formatPublicationDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.toLocaleString("default", { month: "long" });
    const day = date.getDate();
    
    // Check if we have full date or just year/month
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

interface CoverCarouselDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string; // googleBooksId
  bookTitle: string;
  editions: Edition[];
  selectedEditionId?: string;
  onSelect?: (editionId: string, coverUrl: string) => void;
}

// GSAP-based carousel controller
// Simplified version inspired by Codrops GSAP carousel tutorial
// https://tympanus.net/codrops/2025/04/21/mastering-carousels-with-gsap-from-basics-to-advanced-animation/
interface CarouselController {
  next: (options?: { duration?: number; ease?: string }) => void;
  previous: (options?: { duration?: number; ease?: string }) => void;
  toIndex: (index: number, options?: { duration?: number; ease?: string }) => void;
  kill: () => void;
}

function createCarousel(container: HTMLElement, slides: HTMLElement[], wrapper: HTMLElement): CarouselController {
  let currentIndex = 0;
  
  // Calculate center position for each slide
  const calculateCenterOffset = (index: number) => {
    const slide = slides[index];
    if (!slide || !wrapper) return 0;
    
    const slideRect = slide.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Center the slide in the viewport
    const slideCenter = slideRect.left - containerRect.left + slideRect.width / 2;
    const wrapperCenter = wrapperRect.width / 2;
    const offset = slideCenter - wrapperCenter;
    
    return -offset;
  };
  
  const animateToIndex = (targetIndex: number, options?: { duration?: number; ease?: string }) => {
    const duration = options?.duration ?? 0.8;
    const ease = options?.ease ?? "expo.out";
    
    // Recalculate offset in case layout changed
    const offset = calculateCenterOffset(targetIndex);
    
    gsap.to(container, {
      x: offset,
      duration,
      ease,
    });
    
    currentIndex = targetIndex;
  };
  
  return {
    next: (options) => {
      const nextIndex = (currentIndex + 1) % slides.length;
      animateToIndex(nextIndex, options);
    },
    previous: (options) => {
      const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
      animateToIndex(prevIndex, options);
    },
    toIndex: (index, options) => {
      if (index >= 0 && index < slides.length) {
        animateToIndex(index, options);
      }
    },
    kill: () => {
      gsap.killTweensOf(container);
    },
  };
}

export default function CoverCarouselDialog({
  open,
  onOpenChange,
  bookId,
  bookTitle,
  editions,
  selectedEditionId,
  onSelect,
}: CoverCarouselDialogProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement[]>([]);
  const controllerRef = useRef<CarouselController | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initialize GSAP carousel
  useEffect(() => {
    if (!open || !carouselRef.current || !wrapperRef.current || editions.length === 0) return;

    // Wait for layout
    const timeoutId = setTimeout(() => {
      const slides = slidesRef.current.filter(Boolean);
      if (slides.length === 0 || !carouselRef.current || !wrapperRef.current) return;

      // Find selected edition index
      const selectedIdx = selectedEditionId
        ? editions.findIndex(e => e.id === selectedEditionId)
        : 0;
      
      // Create carousel controller
      const controller = createCarousel(carouselRef.current, slides, wrapperRef.current);
      controllerRef.current = controller;

      // Center on selected edition
      if (selectedIdx >= 0 && selectedIdx < slides.length) {
        setActiveIndex(selectedIdx);
        controller.toIndex(selectedIdx, { duration: 0 });
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (controllerRef.current) {
        controllerRef.current.kill();
        controllerRef.current = null;
      }
    };
  }, [open, editions.length, selectedEditionId]);

  const handleNext = () => {
    if (!controllerRef.current) return;
    controllerRef.current.next({ duration: 0.8, ease: "expo.out" });
    setActiveIndex((prev) => (prev + 1) % editions.length);
  };

  const handlePrevious = () => {
    if (!controllerRef.current) return;
    controllerRef.current.previous({ duration: 0.8, ease: "expo.out" });
    setActiveIndex((prev) => (prev - 1 + editions.length) % editions.length);
  };

  const handleSelect = (edition: Edition) => {
    if (!edition.coverUrl) return;
    
    setCoverPreference(bookId, edition.id, edition.coverUrl);
    onSelect?.(edition.id, edition.coverUrl);
    onOpenChange(false);
  };

  if (editions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-xl font-bold mb-1">Select Cover Edition</h2>
          <p className="text-sm text-muted-foreground">{bookTitle}</p>
        </div>

        <div className="relative">
          {/* Carousel Container */}
          <div ref={wrapperRef} className="overflow-hidden px-16 py-8">
            <div
              ref={carouselRef}
              className="flex items-center gap-4"
              style={{ willChange: "transform" }}
            >
            {editions.map((edition, index) => (
              <div
                key={edition.id}
                ref={(el) => {
                  if (el) slidesRef.current[index] = el;
                }}
                className={cn(
                  "flex-shrink-0 cursor-pointer transition-opacity",
                  "w-32 md:w-40 lg:w-48",
                  activeIndex === index ? "opacity-100" : "opacity-60"
                )}
                onClick={() => handleSelect(edition)}
                onMouseEnter={() => {
                  if (controllerRef.current && activeIndex !== index) {
                    controllerRef.current.toIndex(index, { duration: 0.5, ease: "power2.out" });
                    setActiveIndex(index);
                  }
                }}
              >
                <div className="relative group">
                  {edition.coverUrl ? (
                    <img
                      src={edition.coverUrl}
                      alt={`${bookTitle} - ${edition.format}`}
                      className="w-full h-auto rounded-lg shadow-lg object-cover aspect-[2/3]"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No cover</span>
                    </div>
                  )}
                  
                  {/* Selected indicator */}
                  {selectedEditionId === edition.id && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  
                  {/* Format badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-2 rounded-b-lg">
                    <div className="text-xs font-medium text-center">
                      {edition.format}
                    </div>
                    {edition.editionStatement && (
                      <div className="text-xs text-muted-foreground text-center mt-0.5">
                        {edition.editionStatement}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Edition Metadata - Below cover */}
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground text-center">
                    {edition.format}
                    {edition.editionStatement && ` • ${edition.editionStatement}`}
                  </div>
                  {edition.publicationDate && (
                    <div className="text-xs text-muted-foreground text-center">
                      Published {formatPublicationDate(edition.publicationDate)}
                    </div>
                  )}
                  {edition.market && (
                    <div className="text-xs text-muted-foreground text-center">
                      {edition.market} Edition
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            onClick={handlePrevious}
            aria-label="Previous cover"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            onClick={handleNext}
            aria-label="Next cover"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 pb-6 pt-2 text-center">
          <div className="text-xs text-muted-foreground">
            {activeIndex + 1} / {editions.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

