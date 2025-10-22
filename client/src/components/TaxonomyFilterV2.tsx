import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit3, X, Search, ChevronDown, ChevronUp } from "lucide-react";
import {
  type TaxonomyData,
  type FilterState,
  type FilterDimension,
  loadTaxonomyData,
  getRelevantTags,
  removeFilter,
  getDomainsForGenre,
  getSupergenresForGenre,
  getFilteredGenres,
} from "@/lib/taxonomyFilter";

interface TaxonomyFilterV2Props {
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  className?: string;
}

interface FilterChipProps {
  dimension: FilterDimension;
  onRemove: () => void;
  size?: "genre" | "subgenre" | "tag" | "normal";
}

function FilterChip({ dimension, onRemove, size = "normal" }: FilterChipProps) {
  const isBlocked = !dimension.include;
  
  const sizeClasses = {
    genre: "text-lg font-display font-bold",
    subgenre: "text-base font-semibold",
    tag: "text-xs",
    normal: "text-sm",
  };
  
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
        isBlocked 
          ? "bg-destructive/15 text-destructive border-2 border-destructive/30"
          : "bg-primary/15 text-primary border border-primary/30"
      }`}
    >
      <span className={sizeClasses[size]}>{dimension.name}</span>
      <button
        onClick={onRemove}
        className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        aria-label={`Remove ${dimension.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  onEdit?: () => void;
  isHidden?: boolean;
  onToggleVisibility?: () => void;
  count?: number;
}

function SectionHeader({ title, onEdit, isHidden, onToggleVisibility, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      {onToggleVisibility && (
        <button
          onClick={onToggleVisibility}
          className="p-1 hover:bg-muted rounded transition-colors"
          aria-label={isHidden ? `Show ${title}` : `Hide ${title}`}
        >
          {isHidden ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      )}
      <h3 className="text-sm font-semibold text-foreground/90">{title}</h3>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-primary/10 rounded-full transition-colors"
          aria-label={`Edit ${title}`}
        >
          <Edit3 className="h-3.5 w-3.5 text-primary" />
        </button>
      )}
    </div>
  );
}

interface GenreSubgenreSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  onSave: (genre: FilterDimension, subgenre: FilterDimension | null) => void;
  selectedDomains?: FilterDimension[];
  selectedSupergenres?: FilterDimension[];
}

function GenreSubgenreSelector({ open, onClose, taxonomy, onSave, selectedDomains = [], selectedSupergenres = [] }: GenreSubgenreSelectorProps) {
  const [stage, setStage] = useState<"genre" | "subgenre">("genre");
  const [selectedGenre, setSelectedGenre] = useState<FilterDimension | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Apply hierarchical filtering based on selected domains/supergenres
  const filteredGenres = useMemo(() => {
    const domainSlugs = selectedDomains.map(d => d.slug);
    const supergenreSlugs = selectedSupergenres.map(s => s.slug);
    
    let genres = getFilteredGenres(taxonomy, domainSlugs, supergenreSlugs);
    
    if (!searchQuery.trim()) return genres;
    const query = searchQuery.toLowerCase();
    return genres.filter(g => 
      g.name.toLowerCase().includes(query) ||
      g.slug.toLowerCase().includes(query)
    );
  }, [taxonomy, searchQuery, selectedDomains, selectedSupergenres]);
  
  const availableSubgenres = useMemo(() => {
    if (!selectedGenre) return [];
    const subgenres = taxonomy.subgenres.filter(sg => sg.genre_slug === selectedGenre.slug);
    if (!searchQuery.trim()) return subgenres;
    const query = searchQuery.toLowerCase();
    return subgenres.filter(sg => sg.name.toLowerCase().includes(query));
  }, [taxonomy.subgenres, selectedGenre, searchQuery]);
  
  const handleGenreSelect = (genre: { slug: string; name: string }) => {
    const dimension: FilterDimension = {
      type: "genre",
      slug: genre.slug,
      name: genre.name,
      include: true,
    };
    setSelectedGenre(dimension);
    setStage("subgenre");
    setSearchQuery("");
  };
  
  const handleSubgenreSelect = (subgenre: { slug: string; name: string } | null) => {
    if (!selectedGenre) return;
    
    const subgenreDimension: FilterDimension | null = subgenre ? {
      type: "subgenre",
      slug: subgenre.slug,
      name: subgenre.name,
      include: true,
      parent: selectedGenre.slug,
    } : null;
    
    onSave(selectedGenre, subgenreDimension);
    handleClose();
  };
  
  const handleClose = () => {
    setStage("genre");
    setSelectedGenre(null);
    setSearchQuery("");
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {stage === "genre" ? "Select Genre" : `Select ${selectedGenre?.name} Subgenre`}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={stage === "genre" ? "Search genres..." : "Search subgenres..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {stage === "genre" ? (
              <div className="divide-y">
                {filteredGenres.map((genre) => (
                  <button
                    key={genre.slug}
                    onClick={() => handleGenreSelect(genre)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{genre.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y">
                <button
                  onClick={() => handleSubgenreSelect(null)}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-colors italic text-muted-foreground"
                >
                  No subgenre (just {selectedGenre?.name})
                </button>
                {availableSubgenres.map((subgenre) => (
                  <button
                    key={subgenre.slug}
                    onClick={() => handleSubgenreSelect(subgenre)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-medium">{subgenre.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {stage === "subgenre" && (
            <Button
              variant="outline"
              onClick={() => {
                setStage("genre");
                setSelectedGenre(null);
                setSearchQuery("");
              }}
              className="w-full"
            >
              Back to Genres
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TagSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  selectedGenres: FilterDimension[];
  selectedTags: FilterDimension[];
  onToggle: (tag: FilterDimension) => void;
}

interface ContentFlagSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  selectedFlags: FilterDimension[];
  onToggle: (flag: FilterDimension) => void;
}

interface FormatSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  selectedFormats: FilterDimension[];
  onToggle: (format: FilterDimension) => void;
}

interface AudienceSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  selectedAudiences: FilterDimension[];
  onToggle: (audience: FilterDimension) => void;
}

interface BlockSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  blockedItems: FilterDimension[];
  onToggle: (item: FilterDimension) => void;
}

function TagSelector({ open, onClose, taxonomy, selectedGenres, selectedTags, onToggle }: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const relevantTags = useMemo(() => {
    const genreSlug = selectedGenres[0]?.slug;
    return getRelevantTags(taxonomy, genreSlug);
  }, [taxonomy, selectedGenres]);
  
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return relevantTags.slice(0, 60);
    const query = searchQuery.toLowerCase();
    return relevantTags.filter(tag =>
      tag.name.toLowerCase().includes(query) ||
      tag.group.toLowerCase().includes(query)
    ).slice(0, 60);
  }, [relevantTags, searchQuery]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Tropes, Themes & Tags</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-4 border rounded-lg bg-muted/20">
            {filteredTags.map((tag) => {
              const isSelected = selectedTags.some(t => t.slug === tag.slug && t.include);
              return (
                <button
                  key={tag.slug}
                  onClick={() => onToggle({
                    type: "tag",
                    slug: tag.slug,
                    name: tag.name,
                    include: true,
                  })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'bg-background text-foreground/80 border-border hover:bg-muted'
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContentFlagSelector({ open, onClose, taxonomy, selectedFlags, onToggle }: ContentFlagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter tags to only show content warning/flag types
  const contentFlags = useMemo(() => {
    return taxonomy.tags.filter(tag => 
      tag.group === 'content_warnings' || tag.group === 'content_flags'
    );
  }, [taxonomy.tags]);
  
  const filteredFlags = useMemo(() => {
    if (!searchQuery.trim()) return contentFlags;
    const query = searchQuery.toLowerCase();
    return contentFlags.filter(flag =>
      flag.name.toLowerCase().includes(query)
    );
  }, [contentFlags, searchQuery]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Content Flags</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content flags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-4 border rounded-lg bg-muted/20">
            {filteredFlags.map((flag) => {
              const isSelected = selectedFlags.some(f => f.slug === flag.slug);
              return (
                <button
                  key={flag.slug}
                  onClick={() => onToggle({
                    type: "tag",
                    slug: flag.slug,
                    name: flag.name,
                    include: true,
                  })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'bg-background text-foreground/80 border-border hover:bg-muted'
                  }`}
                >
                  {flag.name}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormatSelector({ open, onClose, taxonomy, selectedFormats, onToggle }: FormatSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredFormats = useMemo(() => {
    if (!searchQuery.trim()) return taxonomy.formats;
    const query = searchQuery.toLowerCase();
    return taxonomy.formats.filter(format =>
      format.name.toLowerCase().includes(query)
    );
  }, [taxonomy.formats, searchQuery]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Format</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search formats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {filteredFormats.map((format) => {
              const isSelected = selectedFormats.some(f => f.slug === format.slug);
              return (
                <button
                  key={format.slug}
                  onClick={() => onToggle({
                    type: "format",
                    slug: format.slug,
                    name: format.name,
                    include: true,
                  })}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {format.name}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SimpleSelectorProps {
  open: boolean;
  onClose: () => void;
  taxonomy: TaxonomyData;
  items: { slug: string; name: string }[];
  onToggle: (item: FilterDimension) => void;
  selectedSlugs: string[];
  title: string;
  type: FilterDimension['type'];
}

function SimpleSelector({ open, onClose, items, onToggle, selectedSlugs, title, type }: SimpleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
            {filteredItems.map((item) => {
              const isSelected = selectedSlugs.includes(item.slug);
              return (
                <button
                  key={item.slug}
                  onClick={() => onToggle({
                    type,
                    slug: item.slug,
                    name: item.name,
                    include: true,
                  })}
                  className={`px-4 py-3 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AudienceSelector({ open, onClose, taxonomy, selectedAudiences, onToggle }: AudienceSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Audience (Age Market)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {taxonomy.ageMarkets.map((market) => {
            const isSelected = selectedAudiences.some(a => a.slug === market.slug);
            return (
              <button
                key={market.slug}
                onClick={() => onToggle({
                  type: "age_market",
                  slug: market.slug,
                  name: market.name,
                  include: true,
                })}
                className={`w-full px-4 py-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                }`}
              >
                <div className="font-medium">{market.name}</div>
                {(market.min_age || market.max_age) && (
                  <div className="text-xs opacity-80 mt-1">
                    Ages {market.min_age || '?'}–{market.max_age || '?'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlockSelector({ open, onClose, taxonomy, blockedItems, onToggle }: BlockSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Combine tags and content flags for blocking
  const blockableItems = useMemo(() => {
    const tags = taxonomy.tags.map(t => ({ ...t, itemType: 'tag' as const }));
    return tags;
  }, [taxonomy.tags]);
  
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return blockableItems.slice(0, 80);
    const query = searchQuery.toLowerCase();
    return blockableItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query)
    ).slice(0, 80);
  }, [blockableItems, searchQuery]);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Block Tags & Content Flags</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search to block tags or content flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Blocked items will exclude books with these tags from your results
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-4 border rounded-lg bg-destructive/5">
            {filteredItems.map((item) => {
              const isBlocked = blockedItems.some(b => b.slug === item.slug && !b.include);
              return (
                <button
                  key={item.slug}
                  onClick={() => onToggle({
                    type: "tag",
                    slug: item.slug,
                    name: item.name,
                    include: false, // Block filter
                  })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    isBlocked
                      ? 'bg-destructive text-destructive-foreground border-destructive font-medium'
                      : 'bg-background text-foreground/80 border-border hover:bg-destructive/10'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TaxonomyFilterV2({ filterState, onFilterChange, className = "" }: TaxonomyFilterV2Props) {
  const [taxonomy, setTaxonomy] = useState<TaxonomyData>({
    domains: [],
    supergenres: [],
    genres: [],
    subgenres: [],
    formats: [],
    ageMarkets: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [supergenreModalOpen, setSupergenreModalOpen] = useState(false);
  const [contentFlagModalOpen, setContentFlagModalOpen] = useState(false);
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [audienceModalOpen, setAudienceModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  
  const [showDomain, setShowDomain] = useState(false);
  const [showSupergenre, setShowSupergenre] = useState(false);
  const [showContentFlags, setShowContentFlags] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  
  useEffect(() => {
    loadTaxonomyData().then((data) => {
      setTaxonomy(data);
      setLoading(false);
    });
  }, []);
  
  // Extract filters by type
  const genres = filterState.dimensions.filter(d => d.type === "genre" && d.include);
  const subgenres = filterState.dimensions.filter(d => d.type === "subgenre" && d.include);
  const tags = filterState.dimensions.filter(d => d.type === "tag" && d.include);
  const domains = filterState.dimensions.filter(d => d.type === "domain" && d.include);
  const supergenres = filterState.dimensions.filter(d => d.type === "supergenre" && d.include);
  const formats = filterState.dimensions.filter(d => d.type === "format" && d.include);
  const audiences = filterState.dimensions.filter(d => d.type === "age_market" && d.include);
  const blockedItems = filterState.dimensions.filter(d => !d.include);
  
  // Auto-show Domain and Supergenre when they have values (after arrays are defined)
  useEffect(() => {
    if (domains.length > 0) setShowDomain(true);
    if (supergenres.length > 0) setShowSupergenre(true);
  }, [domains.length, supergenres.length]);
  
  // Filter content flags (subset of tags)
  const contentFlags = tags.filter(t => {
    const tagData = taxonomy.tags.find(tt => tt.slug === t.slug);
    return tagData && (tagData.group === 'content_warnings' || tagData.group === 'content_flags');
  });
  
  const handleRemove = (type: FilterDimension['type'], slug: string) => {
    onFilterChange(removeFilter(filterState, type, slug));
  };
  
  const handleGenreSubgenreSave = (genre: FilterDimension, subgenre: FilterDimension | null) => {
    const newDimensions = [...filterState.dimensions];
    
    // Remove existing genre/subgenre combo if same genre
    const filteredDimensions = newDimensions.filter(d => 
      !(d.type === "genre" && d.slug === genre.slug) &&
      !(d.type === "subgenre" && d.parent === genre.slug)
    );
    
    // Add new selections
    filteredDimensions.push(genre);
    if (subgenre) {
      filteredDimensions.push(subgenre);
    }
    
    // Auto-populate domains for this genre
    const autoDomains = getDomainsForGenre(taxonomy, genre.slug);
    autoDomains.forEach(domain => {
      const alreadyExists = filteredDimensions.some(d => d.type === "domain" && d.slug === domain.slug);
      if (!alreadyExists) {
        filteredDimensions.push({
          type: "domain",
          slug: domain.slug,
          name: domain.name,
          include: true,
        });
      }
    });
    
    // Auto-populate supergenres for this genre
    const autoSupergenres = getSupergenresForGenre(taxonomy, genre.slug);
    autoSupergenres.forEach(supergenre => {
      const alreadyExists = filteredDimensions.some(d => d.type === "supergenre" && d.slug === supergenre.slug);
      if (!alreadyExists) {
        filteredDimensions.push({
          type: "supergenre",
          slug: supergenre.slug,
          name: supergenre.name,
          include: true,
        });
      }
    });
    
    onFilterChange({ ...filterState, dimensions: filteredDimensions });
  };
  
  const handleTagToggle = (tag: FilterDimension) => {
    const exists = filterState.dimensions.some(t => t.type === tag.type && t.slug === tag.slug && t.include === tag.include);
    if (exists) {
      handleRemove(tag.type, tag.slug);
    } else {
      onFilterChange({ ...filterState, dimensions: [...filterState.dimensions, tag] });
    }
  };
  
  const handleItemToggle = (item: FilterDimension) => {
    const exists = filterState.dimensions.some(d => 
      d.type === item.type && d.slug === item.slug && d.include === item.include
    );
    if (exists) {
      handleRemove(item.type, item.slug);
    } else {
      onFilterChange({ ...filterState, dimensions: [...filterState.dimensions, item] });
    }
  };
  
  if (loading) {
    return <div className={`space-y-4 ${className}`}>Loading filters...</div>;
  }
  
  // Group genre-subgenre pairs
  const genreSubgenrePairs = genres.map(genre => ({
    genre,
    subgenre: subgenres.find(sg => sg.parent === genre.slug) || null,
  }));
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Genre / Subgenre Section */}
      <div className="space-y-2">
        <SectionHeader 
          title="Genre / Subgenre" 
          onEdit={() => setGenreModalOpen(true)}
          count={genreSubgenrePairs.length}
        />
        <div className="flex flex-wrap gap-2">
          {genreSubgenrePairs.map(({ genre, subgenre }) => (
            <div key={genre.slug} className="flex flex-col gap-1">
              <FilterChip 
                dimension={genre} 
                onRemove={() => {
                  handleRemove("genre", genre.slug);
                  if (subgenre) handleRemove("subgenre", subgenre.slug);
                }}
                size="genre"
              />
              {subgenre && (
                <FilterChip 
                  dimension={subgenre} 
                  onRemove={() => handleRemove("subgenre", subgenre.slug)}
                  size="subgenre"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Tropes/Themes/Tags Section */}
      <div className="space-y-2">
        <SectionHeader 
          title="Tropes / Themes / Tags" 
          onEdit={() => setTagModalOpen(true)}
          count={tags.length}
        />
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <FilterChip 
              key={tag.slug}
              dimension={tag} 
              onRemove={() => handleRemove("tag", tag.slug)}
              size="tag"
            />
          ))}
        </div>
      </div>
      
      {/* Domain Section (Hidden by default, auto-populated) */}
      <div className="space-y-2">
        <SectionHeader 
          title="Domain" 
          isHidden={!showDomain}
          onToggleVisibility={() => setShowDomain(!showDomain)}
          onEdit={showDomain ? () => setDomainModalOpen(true) : undefined}
          count={domains.length}
        />
        {showDomain && (
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <FilterChip 
                key={domain.slug}
                dimension={domain} 
                onRemove={() => handleRemove("domain", domain.slug)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Supergenre Section (Hidden by default, auto-populated) */}
      <div className="space-y-2">
        <SectionHeader 
          title="Supergenre" 
          isHidden={!showSupergenre}
          onToggleVisibility={() => setShowSupergenre(!showSupergenre)}
          onEdit={showSupergenre ? () => setSupergenreModalOpen(true) : undefined}
          count={supergenres.length}
        />
        {showSupergenre && (
          <div className="flex flex-wrap gap-2">
            {supergenres.map((supergenre) => (
              <FilterChip 
                key={supergenre.slug}
                dimension={supergenre} 
                onRemove={() => handleRemove("supergenre", supergenre.slug)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Content Flags Section (Hidden by default) */}
      <div className="space-y-2">
        <SectionHeader 
          title="Content Flags" 
          isHidden={!showContentFlags}
          onToggleVisibility={() => setShowContentFlags(!showContentFlags)}
          onEdit={showContentFlags ? () => setContentFlagModalOpen(true) : undefined}
          count={contentFlags.length}
        />
        {showContentFlags && (
          <div className="flex flex-wrap gap-2">
            {contentFlags.map((flag) => (
              <FilterChip 
                key={flag.slug}
                dimension={flag} 
                onRemove={() => handleRemove("tag", flag.slug)}
                size="tag"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Format Section (Hidden by default) */}
      <div className="space-y-2">
        <SectionHeader 
          title="Format" 
          isHidden={!showFormat}
          onToggleVisibility={() => setShowFormat(!showFormat)}
          onEdit={showFormat ? () => setFormatModalOpen(true) : undefined}
          count={formats.length}
        />
        {showFormat && (
          <div className="flex flex-wrap gap-2">
            {formats.map((format) => (
              <FilterChip 
                key={format.slug}
                dimension={format} 
                onRemove={() => handleRemove("format", format.slug)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Audience Section (Hidden by default) */}
      <div className="space-y-2">
        <SectionHeader 
          title="Audience" 
          isHidden={!showAudience}
          onToggleVisibility={() => setShowAudience(!showAudience)}
          onEdit={showAudience ? () => setAudienceModalOpen(true) : undefined}
          count={audiences.length}
        />
        {showAudience && (
          <div className="flex flex-wrap gap-2">
            {audiences.map((audience) => (
              <FilterChip 
                key={audience.slug}
                dimension={audience} 
                onRemove={() => handleRemove("age_market", audience.slug)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Block Section (Hidden by default) */}
      <div className="space-y-2">
        <SectionHeader 
          title="Block" 
          isHidden={!showBlock}
          onToggleVisibility={() => setShowBlock(!showBlock)}
          onEdit={showBlock ? () => setBlockModalOpen(true) : undefined}
          count={blockedItems.length}
        />
        {showBlock && (
          <div className="flex flex-wrap gap-2">
            {blockedItems.map((item) => (
              <FilterChip 
                key={`block-${item.slug}`}
                dimension={item} 
                onRemove={() => handleRemove(item.type, item.slug)}
                size="tag"
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Modals */}
      <GenreSubgenreSelector
        open={genreModalOpen}
        onClose={() => setGenreModalOpen(false)}
        taxonomy={taxonomy}
        onSave={handleGenreSubgenreSave}
        selectedDomains={domains}
        selectedSupergenres={supergenres}
      />
      
      <TagSelector
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        taxonomy={taxonomy}
        selectedGenres={genres}
        selectedTags={tags}
        onToggle={handleTagToggle}
      />
      
      <SimpleSelector
        open={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        taxonomy={taxonomy}
        items={taxonomy.domains}
        onToggle={handleItemToggle}
        selectedSlugs={domains.map(d => d.slug)}
        title="Select Domain"
        type="domain"
      />
      
      <SimpleSelector
        open={supergenreModalOpen}
        onClose={() => setSupergenreModalOpen(false)}
        taxonomy={taxonomy}
        items={taxonomy.supergenres}
        onToggle={handleItemToggle}
        selectedSlugs={supergenres.map(s => s.slug)}
        title="Select Supergenre"
        type="supergenre"
      />
      
      <ContentFlagSelector
        open={contentFlagModalOpen}
        onClose={() => setContentFlagModalOpen(false)}
        taxonomy={taxonomy}
        selectedFlags={contentFlags}
        onToggle={handleItemToggle}
      />
      
      <FormatSelector
        open={formatModalOpen}
        onClose={() => setFormatModalOpen(false)}
        taxonomy={taxonomy}
        selectedFormats={formats}
        onToggle={handleItemToggle}
      />
      
      <AudienceSelector
        open={audienceModalOpen}
        onClose={() => setAudienceModalOpen(false)}
        taxonomy={taxonomy}
        selectedAudiences={audiences}
        onToggle={handleItemToggle}
      />
      
      <BlockSelector
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        taxonomy={taxonomy}
        blockedItems={blockedItems}
        onToggle={handleItemToggle}
      />
    </div>
  );
}