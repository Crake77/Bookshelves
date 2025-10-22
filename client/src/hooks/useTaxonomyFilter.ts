import { useState, useCallback, useMemo } from "react";
import {
  type FilterState,
  type FilterDimension,
  createFilterState,
  addFilter,
  removeFilter,
  toggleFilter,
  toLegacyApiParams,
  getFiltersByType,
} from "@/lib/taxonomyFilter";
import { type CategoryPreference } from "@/lib/preferences";

interface UseTaxonomyFilterOptions {
  initialFilters?: FilterDimension[];
  viewMode?: 'simple' | 'advanced';
}

interface UseTaxonomyFilterResult {
  filterState: FilterState;
  setFilterState: (state: FilterState) => void;
  addFilter: (dimension: FilterDimension) => void;
  removeFilter: (type: FilterDimension['type'], slug: string) => void;
  toggleFilter: (dimension: FilterDimension) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'simple' | 'advanced') => void;
  
  // Legacy API compatibility
  legacyApiParams: {
    genre?: string;
    subgenre?: string;
    tag?: string;
    tagAny?: string[];
  };
  
  // Convenience getters
  selectedGenres: FilterDimension[];
  selectedSubgenres: FilterDimension[];
  selectedTags: FilterDimension[];
  includeFilters: FilterDimension[];
  excludeFilters: FilterDimension[];
  hasFilters: boolean;
}

export function useTaxonomyFilter(options: UseTaxonomyFilterOptions = {}): UseTaxonomyFilterResult {
  const [filterState, setFilterState] = useState<FilterState>(() =>
    createFilterState(options.initialFilters, options.viewMode)
  );

  const handleAddFilter = useCallback((dimension: FilterDimension) => {
    setFilterState((state) => addFilter(state, dimension));
  }, []);

  const handleRemoveFilter = useCallback((type: FilterDimension['type'], slug: string) => {
    setFilterState((state) => removeFilter(state, type, slug));
  }, []);

  const handleToggleFilter = useCallback((dimension: FilterDimension) => {
    setFilterState((state) => toggleFilter(state, dimension));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterState((state) => ({ ...state, dimensions: [] }));
  }, []);

  const setViewMode = useCallback((mode: 'simple' | 'advanced') => {
    setFilterState((state) => ({ ...state, viewMode: mode }));
  }, []);

  // Memoized computed values
  const selectedGenres = useMemo(() => getFiltersByType(filterState, 'genre'), [filterState]);
  const selectedSubgenres = useMemo(() => getFiltersByType(filterState, 'subgenre'), [filterState]);
  const selectedTags = useMemo(() => getFiltersByType(filterState, 'tag'), [filterState]);
  
  const includeFilters = useMemo(() => 
    filterState.dimensions.filter(d => d.include), 
    [filterState.dimensions]
  );
  
  const excludeFilters = useMemo(() => 
    filterState.dimensions.filter(d => !d.include), 
    [filterState.dimensions]
  );
  
  const hasFilters = useMemo(() => filterState.dimensions.length > 0, [filterState.dimensions]);
  
  const legacyApiParams = useMemo(() => toLegacyApiParams(filterState), [filterState]);

  return {
    filterState,
    setFilterState,
    addFilter: handleAddFilter,
    removeFilter: handleRemoveFilter,
    toggleFilter: handleToggleFilter,
    clearFilters,
    setViewMode,
    legacyApiParams,
    selectedGenres,
    selectedSubgenres,
    selectedTags,
    includeFilters,
    excludeFilters,
    hasFilters,
  };
}

// Helper functions for converting between old category preferences and new filter system

export function categoryPreferenceToFilterDimensions(category: CategoryPreference): FilterDimension[] {
  const dimensions: FilterDimension[] = [];
  
  // Add domain filters if specified
  if (category.domainSlugs && category.domainNames) {
    category.domainSlugs.forEach((slug, index) => {
      const name = category.domainNames?.[index];
      if (name) {
        dimensions.push({
          type: 'domain',
          slug,
          name,
          include: true,
        });
      }
    });
  }
  
  // Add supergenre filters if specified
  if (category.supergenreSlugs && category.supergenreNames) {
    category.supergenreSlugs.forEach((slug, index) => {
      const name = category.supergenreNames?.[index];
      if (name) {
        dimensions.push({
          type: 'supergenre',
          slug,
          name,
          include: true,
        });
      }
    });
  }
  
  // Add genre filter if it's a genre-based category
  if (category.categoryType === 'genre' && category.name) {
    dimensions.push({
      type: 'genre',
      slug: category.slug,
      name: category.name,
      include: true,
    });
  }
  
  // Add subgenre filter if specified
  if (category.subgenreSlug && category.subgenreName) {
    dimensions.push({
      type: 'subgenre',
      slug: category.subgenreSlug,
      name: category.subgenreName,
      include: true,
      parent: category.slug, // Link to parent genre
    });
  }
  
  // Add tag filters if specified
  if (category.tagSlugs && category.tagNames) {
    category.tagSlugs.forEach((slug, index) => {
      const name = category.tagNames?.[index];
      if (name) {
        dimensions.push({
          type: 'tag',
          slug,
          name,
          include: true,
        });
      }
    });
  }
  
  // Add blocked tag filters if specified
  if (category.blockedTagSlugs && category.blockedTagNames) {
    category.blockedTagSlugs.forEach((slug, index) => {
      const name = category.blockedTagNames?.[index];
      if (name) {
        dimensions.push({
          type: 'tag',
          slug,
          name,
          include: false,
        });
      }
    });
  }
  
  // Add format filters if specified
  if (category.formatSlugs && category.formatNames) {
    category.formatSlugs.forEach((slug, index) => {
      const name = category.formatNames?.[index];
      if (name) {
        dimensions.push({
          type: 'format',
          slug,
          name,
          include: true,
        });
      }
    });
  }
  
  // Add audience filters if specified
  if (category.audienceSlugs && category.audienceNames) {
    category.audienceSlugs.forEach((slug, index) => {
      const name = category.audienceNames?.[index];
      if (name) {
        dimensions.push({
          type: 'age_market',
          slug,
          name,
          include: true,
        });
      }
    });
  }
  
  return dimensions;
}

export function filterDimensionsToCategoryPreference(
  dimensions: FilterDimension[],
  baseCategory: Partial<CategoryPreference>
): CategoryPreference {
  const domainFilters = dimensions.filter(d => d.type === 'domain' && d.include);
  const supergenreFilters = dimensions.filter(d => d.type === 'supergenre' && d.include);
  const genreFilter = dimensions.find(d => d.type === 'genre');
  const subgenreFilter = dimensions.find(d => d.type === 'subgenre');
  const tagFilters = dimensions.filter(d => d.type === 'tag' && d.include);
  const blockedTagFilters = dimensions.filter(d => d.type === 'tag' && !d.include);
  const formatFilters = dimensions.filter(d => d.type === 'format' && d.include);
  const audienceFilters = dimensions.filter(d => d.type === 'age_market' && d.include);
  
  return {
    slug: genreFilter?.slug || baseCategory.slug || 'custom',
    name: genreFilter?.name || baseCategory.name || 'Custom Category',
    categoryType: genreFilter ? 'genre' : 'custom',
    isEnabled: baseCategory.isEnabled ?? true,
    isDefault: baseCategory.isDefault ?? false,
    subgenreSlug: subgenreFilter?.slug,
    subgenreName: subgenreFilter?.name,
    tagSlugs: tagFilters.map(t => t.slug),
    tagNames: tagFilters.map(t => t.name),
    blockedTagSlugs: blockedTagFilters.map(t => t.slug),
    blockedTagNames: blockedTagFilters.map(t => t.name),
    domainSlugs: domainFilters.map(d => d.slug),
    domainNames: domainFilters.map(d => d.name),
    supergenreSlugs: supergenreFilters.map(s => s.slug),
    supergenreNames: supergenreFilters.map(s => s.name),
    formatSlugs: formatFilters.map(f => f.slug),
    formatNames: formatFilters.map(f => f.name),
    audienceSlugs: audienceFilters.map(a => a.slug),
    audienceNames: audienceFilters.map(a => a.name),
  };
}

// Hook variant that syncs with category preferences
interface UseCategoryFilterOptions extends UseTaxonomyFilterOptions {
  category: CategoryPreference;
  onCategoryUpdate: (category: CategoryPreference) => void;
}

export function useCategoryFilter(options: UseCategoryFilterOptions): UseTaxonomyFilterResult {
  // Initialize from category preference
  const initialFilters = useMemo(() => 
    categoryPreferenceToFilterDimensions(options.category), 
    [options.category]
  );
  
  const filter = useTaxonomyFilter({
    ...options,
    initialFilters,
  });
  
  // Sync changes back to category preference
  const handleFilterStateChange = useCallback((state: FilterState) => {
    filter.setFilterState(state);
    
    // Convert back to category preference and notify parent
    const updatedCategory = filterDimensionsToCategoryPreference(state.dimensions, options.category);
    options.onCategoryUpdate(updatedCategory);
  }, [filter, options]);
  
  return {
    ...filter,
    setFilterState: handleFilterStateChange,
  };
}