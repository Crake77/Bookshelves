import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShelfSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function ShelfSection({ 
  title, 
  count, 
  children, 
  defaultOpen = false 
}: ShelfSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        data-testid={`shelf-${title.toLowerCase().replace(/\s+/g, "-")}`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-4 hover-elevate active-elevate-2 rounded-lg transition-all"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <Badge 
          variant="secondary" 
          className="rounded-full px-3 py-1 text-xs font-medium"
        >
          {count}
        </Badge>
      </button>
      
      {isOpen && (
        <div className="mt-3 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  );
}
