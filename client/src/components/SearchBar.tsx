import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
  placeholder?: string;
}

export default function SearchBar({ 
  value, 
  onChange, 
  onFilterClick,
  placeholder = "Filter by name" 
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 rounded-full bg-card border-card-border"
        />
      </div>
      {onFilterClick && (
        <button
          data-testid="button-filter"
          onClick={onFilterClick}
          className="p-2 rounded-full hover-elevate active-elevate-2 transition-all"
        >
          <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
