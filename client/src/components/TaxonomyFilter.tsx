import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, Edit3, X, Search } from "lucide-react";
import {
  type TaxonomyData,
  type FilterState,
  type FilterDimension,
  type FilterDisplayConfig,
  loadTaxonomyData,
  getGenreHierarchy,
  getRelevantTags,
  addFilter,
  removeFilter,
  getFiltersByType,
  getIncludeFilters,
  getExcludeFilters,
  createFilterState,
  DEFAULT_FILTER_CONFIG,
} from "@/lib/taxonomyFilter";

interface TaxonomyFilterProps {
  filterState: FilterState;
  onFilterChange: (state: FilterState) => void;
  config?: Partial<FilterDisplayConfig>;
  className?: string;
  showEditIcons?: boolean;
  onCustomEdit?: (dimension: FilterDimension) => void;
}

interface FilterChipProps {
  dimension: FilterDimension;
  onRemove: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
}

function FilterChip({ dimension, onRemove, onEdit, showEdit = false }: FilterChipProps) {
  const isBlocked = !dimension.include;
  
  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        isBlocked 
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : "bg-primary/10 text-primary border border-primary/20"
      }`}
    >
      {/* Primary display - Genre in large font */}
      {dimension.type === 'genre' && (
        <span className="font-display text-base font-semibold">{dimension.name}</span>
      )}
      
      {/* Secondary display - Subgenre in different font */}
      {dimension.type === 'subgenre' && (
        <span className="font-medium">{dimension.name}</span>
      )}
      
      {/* Tertiary display - Tags and other dimensions in smaller font */}
      {!['genre', 'subgenre'].includes(dimension.type) && (
        <span className="text-sm">{dimension.name}</span>
      )}
      
      {showEdit && onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
          onClick={onEdit}
        >
          <Edit3 className="h-3 w-3" />
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface GenreSelectorProps {
  taxonomy: TaxonomyData;
  selectedGenres: FilterDimension[];
  onGenreChange: (genre: FilterDimension) => void;
}

function GenreSelector({ taxonomy, selectedGenres, onGenreChange }: GenreSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return taxonomy.genres;
    const query = searchQuery.toLowerCase();
    return taxonomy.genres.filter(g => 
      g.name.toLowerCase().includes(query) ||
      g.slug.toLowerCase().includes(query)
    );
  }, [taxonomy.genres, searchQuery]);
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">🎭 Genres</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search genres..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
        {filteredGenres.slice(0, 20).map((genre) => {
          const isSelected = selectedGenres.some(g => g.slug === genre.slug);
          return (
            <button
              key={genre.slug}
              type="button"
              onClick={() => {
                // Always call onGenreChange - it will handle toggle logic
                onGenreChange({
                  type: 'genre',
                  slug: genre.slug,
                  name: genre.name,
                  include: true,
                });
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                isSelected 
                  ? "bg-primary text-primary-foreground font-medium" 
                  : "hover:bg-muted"
              }`}
            >
              {genre.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SubgenreSelectorProps {
  taxonomy: TaxonomyData;
  selectedGenres: FilterDimension[];
  selectedSubgenres: FilterDimension[];
  onSubgenreChange: (subgenre: FilterDimension) => void;
}

function SubgenreSelector({ taxonomy, selectedGenres, selectedSubgenres, onSubgenreChange }: SubgenreSelectorProps) {
  const availableSubgenres = useMemo(() => {
    if (selectedGenres.length === 0) return taxonomy.subgenres.slice(0, 50);
    
    const selectedGenreSlugs = selectedGenres.map(g => g.slug);
    return taxonomy.subgenres.filter(sg => 
      selectedGenreSlugs.includes(sg.genre_slug)
    );
  }, [taxonomy.subgenres, selectedGenres]);
  
  if (availableSubgenres.length === 0) return null;
  
  // Get currently selected subgenre value for the Select
  const currentValue = selectedSubgenres[0]?.slug ?? "";
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">🏷️ Subgenres</label>
      <Select 
        value={currentValue}
        onValueChange={(value) => {
          if (!value && selectedSubgenres[0]) {
            // Clear selection - trigger toggle to remove
            onSubgenreChange({
              type: 'subgenre',
              slug: selectedSubgenres[0].slug,
              name: selectedSubgenres[0].name,
              include: true,
              parent: selectedSubgenres[0].parent,
            });
            return;
          }
          
          const subgenre = availableSubgenres.find(sg => sg.slug === value);
          if (subgenre) {
            onSubgenreChange({
              type: 'subgenre',
              slug: subgenre.slug,
              name: subgenre.name,
              include: true,
              parent: subgenre.genre_slug,
            });
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a subgenre..." />
        </SelectTrigger>
        <SelectContent className="max-h-64 overflow-y-auto">
          {/* Clear option */}
          {currentValue && (
            <SelectItem key="_clear" value="">
              <span className="text-muted-foreground italic">Clear selection</span>
            </SelectItem>
          )}
          {availableSubgenres.map((subgenre) => (
            <SelectItem key={subgenre.slug} value={subgenre.slug}>
              {subgenre.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface TagSelectorProps {
  taxonomy: TaxonomyData;
  selectedGenres: FilterDimension[];
  selectedTags: FilterDimension[];
  onTagToggle: (tag: FilterDimension) => void;
}

function TagSelector({ taxonomy, selectedGenres, selectedTags, onTagToggle }: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const relevantTags = useMemo(() => {
    const genreSlug = selectedGenres[0]?.slug;
    return getRelevantTags(taxonomy, genreSlug).slice(0, 40);
  }, [taxonomy, selectedGenres]);
  
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return relevantTags;
    const query = searchQuery.toLowerCase();
    return relevantTags.filter(tag =>
      tag.name.toLowerCase().includes(query) ||
      tag.group.toLowerCase().includes(query)
    );
  }, [relevantTags, searchQuery]);
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">🔖 Tags Word Bank</label>
      <Input
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-muted/20">
        {filteredTags.map((tag) => {
          const isSelected = selectedTags.some(t => t.slug === tag.slug && t.include);
          return (
            <button
              key={tag.slug}
              type="button"
              onClick={() => {
                // Always call onTagToggle - it will handle add/remove
                onTagToggle({
                  type: 'tag',
                  slug: tag.slug,
                  name: tag.name,
                  include: true,
                });
              }}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground/80 border-border hover:bg-muted'
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface AdvancedFiltersProps {
  taxonomy: TaxonomyData;
  filterState: FilterState;
  onFilterChange: (dimension: FilterDimension) => void;
  config: FilterDisplayConfig;
}

function AdvancedFilters({ taxonomy, filterState, onFilterChange, config }: AdvancedFiltersProps) {
  const [blockSearchQuery, setBlockSearchQuery] = useState("");
  
  if (filterState.viewMode !== 'advanced') return null;
  
  return (
    <Card className="p-4 space-y-4 border-dashed border-2 border-muted-foreground/20">
      <h3 className="font-medium text-sm text-muted-foreground">Advanced Filters</h3>
      
      {config.showDomains && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">📂 Domains</label>
          <div className="flex gap-2">
            {taxonomy.domains.map((domain) => (
              <Button
                key={domain.slug}
                variant="outline"
                size="sm"
                onClick={() => onFilterChange({
                  type: 'domain',
                  slug: domain.slug,
                  name: domain.name,
                  include: true,
                })}
              >
                {domain.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {config.showFormats && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">📖 Formats</label>
          <div className="grid grid-cols-2 gap-2">
            {taxonomy.formats.map((format) => (
              <Button
                key={format.slug}
                variant="outline"
                size="sm"
                onClick={() => onFilterChange({
                  type: 'format',
                  slug: format.slug,
                  name: format.name,
                  include: true,
                })}
              >
                {format.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {config.showAgeMarkets && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">👶 Age Markets</label>
          <div className="flex flex-wrap gap-2">
            {taxonomy.ageMarkets.map((market) => (
              <Button
                key={market.slug}
                variant="outline"
                size="sm"
                onClick={() => onFilterChange({
                  type: 'age_market',
                  slug: market.slug,
                  name: market.name,
                  include: true,
                })}
              >
                {market.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {config.showBlockSearch && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">🔍 Block Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter tags/flags to exclude..."
              value={blockSearchQuery}
              onChange={(e) => setBlockSearchQuery(e.target.value)}
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && blockSearchQuery.trim()) {
                  // Create block filter
                  onFilterChange({
                    type: 'tag',
                    slug: blockSearchQuery.trim().toLowerCase().replace(/\s+/g, '-'),
                    name: blockSearchQuery.trim(),
                    include: false, // This is a block filter
                  });
                  setBlockSearchQuery("");
                }
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function TaxonomyFilter({
  filterState,
  onFilterChange,
  config = {},
  className = "",
  showEditIcons = false,
  onCustomEdit,
}: TaxonomyFilterProps) {
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
  
  const displayConfig = { ...DEFAULT_FILTER_CONFIG, ...config };
  const includeFilters = getIncludeFilters(filterState);
  const excludeFilters = getExcludeFilters(filterState);
  
  const selectedGenres = getFiltersByType(filterState, 'genre');
  const selectedSubgenres = getFiltersByType(filterState, 'subgenre');
  const selectedTags = getFiltersByType(filterState, 'tag');
  
  useEffect(() => {
    let mounted = true;
    
    loadTaxonomyData().then((data) => {
      if (mounted) {
        setTaxonomy(data);
        setLoading(false);
      }
    });
    
    return () => {
      mounted = false;
    };
  }, []);
  
  const handleFilterToggle = (dimension: FilterDimension) => {
    // Check if this filter already exists
    const exists = filterState.dimensions.some(
      d => d.type === dimension.type && d.slug === dimension.slug && d.include === dimension.include
    );
    
    if (exists) {
      // Remove it (toggle off)
      onFilterChange(removeFilter(filterState, dimension.type, dimension.slug));
    } else {
      // Add it (toggle on)
      onFilterChange(addFilter(filterState, dimension));
    }
  };
  
  const handleFilterRemove = (type: FilterDimension['type'], slug: string) => {
    onFilterChange(removeFilter(filterState, type, slug));
  };
  
  const toggleViewMode = () => {
    onFilterChange({
      ...filterState,
      viewMode: filterState.viewMode === 'simple' ? 'advanced' : 'simple',
    });
  };
  
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Filters Display */}
      {(includeFilters.length > 0 || excludeFilters.length > 0) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {includeFilters.map((filter) => (
              <FilterChip
                key={`${filter.type}-${filter.slug}`}
                dimension={filter}
                onRemove={() => handleFilterRemove(filter.type, filter.slug)}
                onEdit={onCustomEdit ? () => onCustomEdit(filter) : undefined}
                showEdit={showEditIcons}
              />
            ))}
            {excludeFilters.map((filter) => (
              <FilterChip
                key={`${filter.type}-${filter.slug}-blocked`}
                dimension={filter}
                onRemove={() => handleFilterRemove(filter.type, filter.slug)}
                onEdit={onCustomEdit ? () => onCustomEdit(filter) : undefined}
                showEdit={showEditIcons}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Simple View Filters */}
      <Card className="p-4 space-y-4">
        {displayConfig.showGenres && (
          <GenreSelector
            taxonomy={taxonomy}
            selectedGenres={selectedGenres}
            onGenreChange={handleFilterToggle}
          />
        )}
        
        {displayConfig.showSubgenres && selectedGenres.length > 0 && (
          <SubgenreSelector
            taxonomy={taxonomy}
            selectedGenres={selectedGenres}
            selectedSubgenres={selectedSubgenres}
            onSubgenreChange={handleFilterToggle}
          />
        )}
        
        {displayConfig.showTags && (
          <TagSelector
            taxonomy={taxonomy}
            selectedGenres={selectedGenres}
            selectedTags={selectedTags}
            onTagToggle={handleFilterToggle}
          />
        )}
        
        {/* View Mode Toggle */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleViewMode}
            className="w-full"
          >
            {filterState.viewMode === 'simple' ? (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show Advanced Filters
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Advanced Filters
              </>
            )}
          </Button>
        </div>
      </Card>
      
      {/* Advanced View Filters */}
      <AdvancedFilters
        taxonomy={taxonomy}
        filterState={filterState}
        onFilterChange={handleFilterToggle}
        config={displayConfig}
      />
    </div>
  );
}