// Comprehensive taxonomy-based filter system
// Replaces hardcoded genre lists with dynamic taxonomy API integration

export interface TaxonomyData {
  domains: Array<{ slug: string; name: string }>;
  supergenres: Array<{ slug: string; name: string; description: string | null }>;
  genres: Array<{ slug: string; name: string }>;
  subgenres: Array<{ slug: string; name: string; genre_slug: string; genre_name: string }>;
  formats: Array<{ slug: string; name: string; description: string | null }>;
  ageMarkets: Array<{ slug: string; name: string; min_age: number | null; max_age: number | null }>;
  tags: Array<{ slug: string; name: string; group: string }>;
  genreDomainLinks?: Array<{ genre_slug: string; domain_slug: string }>;
  genreSupergenreLinks?: Array<{ genre_slug: string; supergenre_slug: string }>;
  supergenreDomainLinks?: Array<{ supergenre_slug: string; domain_slug: string }>;
}

export interface FilterDimension {
  type: 'domain' | 'supergenre' | 'genre' | 'subgenre' | 'format' | 'age_market' | 'tag';
  slug: string;
  name: string;
  include: boolean; // true = filter FOR, false = filter AGAINST (block)
  parent?: string; // parent slug for hierarchical relationships
}

export interface FilterState {
  dimensions: FilterDimension[];
  viewMode: 'simple' | 'advanced';
}

export interface FilterDisplayConfig {
  // Simple view (default)
  showGenres: boolean;
  showSubgenres: boolean;
  showTags: boolean;
  
  // Advanced view
  showDomains: boolean;
  showSupergenres: boolean;
  showFormats: boolean;
  showAgeMarkets: boolean;
  showContentFlags: boolean;
  showBlockSearch: boolean;
}

export const DEFAULT_FILTER_CONFIG: FilterDisplayConfig = {
  // Simple view
  showGenres: true,
  showSubgenres: true,
  showTags: true,
  
  // Advanced view  
  showDomains: false,
  showSupergenres: false,
  showFormats: false,
  showAgeMarkets: false,
  showContentFlags: false,
  showBlockSearch: false,
};

// Cache for taxonomy data to avoid repeated API calls
let taxonomyCache: { data: TaxonomyData; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear the cache to force fresh data load
export function clearTaxonomyCache() {
  taxonomyCache = null;
}

export async function loadTaxonomyData(limit = 500): Promise<TaxonomyData> {
  // Return cached data if still fresh
  if (taxonomyCache && Date.now() - taxonomyCache.timestamp < CACHE_DURATION) {
    return taxonomyCache.data;
  }

  try {
    const response = await fetch(`/api/taxonomy-list?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to load taxonomy: ${response.status}`);
    }
    
    const data = await response.json();
    const taxonomyData: TaxonomyData = {
      domains: data.domains || [],
      supergenres: data.supergenres || [],
      genres: data.genres || [],
      subgenres: data.subgenres || [],
      formats: data.formats || [],
      ageMarkets: data.ageMarkets || [],
      tags: data.tags || [],
      genreDomainLinks: data.genreDomainLinks || [],
      genreSupergenreLinks: data.genreSupergenreLinks || [],
      supergenreDomainLinks: data.supergenreDomainLinks || [],
    };
    
    // Update cache
    taxonomyCache = { data: taxonomyData, timestamp: Date.now() };
    return taxonomyData;
  } catch (error) {
    console.error('Failed to load taxonomy data:', error);
    // Return empty structure on error
    return {
      domains: [],
      supergenres: [],
      genres: [],
      subgenres: [],
      formats: [],
      ageMarkets: [],
      tags: [],
      genreDomainLinks: [],
      genreSupergenreLinks: [],
      supergenreDomainLinks: [],
    };
  }
}

// Get domains for a given genre (auto-population)
export function getDomainsForGenre(taxonomy: TaxonomyData, genreSlug: string): Array<{ slug: string; name: string }> {
  const links = taxonomy.genreDomainLinks || [];
  const domainSlugs = links.filter(l => l.genre_slug === genreSlug).map(l => l.domain_slug);
  return taxonomy.domains.filter(d => domainSlugs.includes(d.slug));
}

// Get supergenres for a given genre (auto-population)
export function getSupergenresForGenre(taxonomy: TaxonomyData, genreSlug: string): Array<{ slug: string; name: string; description: string | null }> {
  const links = taxonomy.genreSupergenreLinks || [];
  const supergenreSlugs = links.filter(l => l.genre_slug === genreSlug).map(l => l.supergenre_slug);
  return taxonomy.supergenres.filter(s => supergenreSlugs.includes(s.slug));
}

// Get domains for a given supergenre (auto-population)
export function getDomainsForSupergenre(taxonomy: TaxonomyData, supergenreSlug: string): Array<{ slug: string; name: string }> {
  const links = taxonomy.supergenreDomainLinks || [];
  const domainSlugs = links.filter(l => l.supergenre_slug === supergenreSlug).map(l => l.domain_slug);
  return taxonomy.domains.filter(d => domainSlugs.includes(d.slug));
}

// Get genres for selected domains (hierarchical filtering)
export function getGenresForDomains(taxonomy: TaxonomyData, domainSlugs: string[]): Array<{ slug: string; name: string }> {
  if (domainSlugs.length === 0) return taxonomy.genres;
  
  const links = taxonomy.genreDomainLinks || [];
  const genreSlugs = links
    .filter(l => domainSlugs.includes(l.domain_slug))
    .map(l => l.genre_slug);
  
  return taxonomy.genres.filter(g => genreSlugs.includes(g.slug));
}

// Get genres for selected supergenres (hierarchical filtering)
export function getGenresForSupergenres(taxonomy: TaxonomyData, supergenreSlugs: string[]): Array<{ slug: string; name: string }> {
  if (supergenreSlugs.length === 0) return taxonomy.genres;
  
  const links = taxonomy.genreSupergenreLinks || [];
  const genreSlugs = links
    .filter(l => supergenreSlugs.includes(l.supergenre_slug))
    .map(l => l.genre_slug);
  
  return taxonomy.genres.filter(g => genreSlugs.includes(g.slug));
}

// Combine domain and supergenre filters (intersection)
export function getFilteredGenres(taxonomy: TaxonomyData, domainSlugs: string[], supergenreSlugs: string[]): Array<{ slug: string; name: string }> {
  let genres = taxonomy.genres;
  
  if (domainSlugs.length > 0) {
    const domainGenres = getGenresForDomains(taxonomy, domainSlugs);
    genres = genres.filter(g => domainGenres.some(dg => dg.slug === g.slug));
  }
  
  if (supergenreSlugs.length > 0) {
    const supergenreGenres = getGenresForSupergenres(taxonomy, supergenreSlugs);
    genres = genres.filter(g => supergenreGenres.some(sg => sg.slug === g.slug));
  }
  
  return genres;
}

export function getGenreHierarchy(taxonomy: TaxonomyData, genreSlug: string): {
  genre: { slug: string; name: string } | null;
  subgenres: Array<{ slug: string; name: string }>;
} {
  const genre = taxonomy.genres.find(g => g.slug === genreSlug) || null;
  const subgenres = taxonomy.subgenres.filter(sg => sg.genre_slug === genreSlug);
  
  return { genre, subgenres };
}

export function getRelevantTags(taxonomy: TaxonomyData, genreSlug?: string, groups?: string[]): Array<{ slug: string; name: string; group: string; priority: number }> {
  const defaultGroups = ['tropes_themes', 'setting', 'tone_mood', 'format'];
  const filterGroups = groups || defaultGroups;
  
  // Define genre-specific tag priorities
  const GENRE_TAG_PRIORITIES: Record<string, string[]> = {
    romance: [
      'enemies-to-lovers', 'friends-to-lovers', 'rivals-to-lovers', 'second-chance', 
      'slow-burn', 'insta-love', 'fake-dating', 'marriage-of-convenience', 
      'forced-proximity', 'love-triangle', 'arranged-marriage', 'grumpy-sunshine',
      'secret-relationship', 'forbidden-love', 'age-gap', 'best-friends-sibling',
      'sibling-best-friend', 'only-one-bed', 'mistaken-identity', 'pen-pals',
      'soulmates', 'amnesia', 'secret-baby', 'accidental-pregnancy'
    ],
    fiction: [
      'quest', 'court-intrigue', 'political-maneuvering', 'found-family', 
      'magic-system', 'secondary-world', 'epic-length-600p', 'first-contact',
      'artificial-intelligence', 'colonization', 'space', 'near-future', 'time-loop'
    ],
    mystery: [
      'locked-room', 'missing-persons', 'police-procedural', 'noir', 
      'suspenseful', 'cold-case'
    ],
    horror: [
      'dark', 'bleak', 'survival', 'isolation', 'haunted-house', 'supernatural-paranormal'
    ],
  };

  // Romance-only tags that should be deprioritized for non-romance
  const ROMANCE_EXCLUSIVE = new Set([
    'enemies-to-lovers', 'friends-to-lovers', 'rivals-to-lovers', 'second-chance',
    'insta-love', 'fake-dating', 'marriage-of-convenience', 'forced-proximity',
    'love-triangle', 'arranged-marriage', 'grumpy-sunshine', 'secret-relationship',
    'forbidden-love', 'age-gap', 'best-friends-sibling', 'sibling-best-friend',
    'only-one-bed', 'secret-baby', 'accidental-pregnancy', 'pen-pals', 'soulmates', 'amnesia'
  ]);

  const priorityList = GENRE_TAG_PRIORITIES[genreSlug || ''] || [];
  const priorityMap = new Map(priorityList.map((slug, index) => [slug, priorityList.length - index]));

  return taxonomy.tags
    .filter(tag => filterGroups.includes(tag.group))
    .map(tag => {
      let priority = 0;
      
      // Base priority by group
      if (tag.group === 'tropes_themes') priority += 3;
      else if (tag.group === 'setting') priority += 2;
      else if (tag.group === 'tone_mood') priority += 1;
      
      // Genre-specific boost
      const genreBoost = priorityMap.get(tag.slug) || 0;
      priority += genreBoost;
      
      // Romance penalty for non-romance genres
      if (genreSlug !== 'romance' && ROMANCE_EXCLUSIVE.has(tag.slug)) {
        priority -= 50;
      }
      
      return { ...tag, priority };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.name.localeCompare(b.name);
    });
}

export function createFilterState(dimensions: FilterDimension[] = [], viewMode: 'simple' | 'advanced' = 'simple'): FilterState {
  return { dimensions, viewMode };
}

export function addFilter(state: FilterState, dimension: FilterDimension): FilterState {
  // Remove any existing filter for this type+slug combination
  const filtered = state.dimensions.filter(d => !(d.type === dimension.type && d.slug === dimension.slug));
  
  return {
    ...state,
    dimensions: [...filtered, dimension],
  };
}

export function removeFilter(state: FilterState, type: string, slug: string): FilterState {
  return {
    ...state,
    dimensions: state.dimensions.filter(d => !(d.type === type && d.slug === slug)),
  };
}

export function toggleFilter(state: FilterState, dimension: FilterDimension): FilterState {
  const existing = state.dimensions.find(d => d.type === dimension.type && d.slug === dimension.slug);
  
  if (existing) {
    // If same include state, remove it; otherwise toggle include/exclude
    if (existing.include === dimension.include) {
      return removeFilter(state, dimension.type, dimension.slug);
    } else {
      return addFilter(state, dimension);
    }
  } else {
    return addFilter(state, dimension);
  }
}

export function getFiltersByType(state: FilterState, type: FilterDimension['type']): FilterDimension[] {
  return state.dimensions.filter(d => d.type === type);
}

export function getIncludeFilters(state: FilterState): FilterDimension[] {
  return state.dimensions.filter(d => d.include);
}

export function getExcludeFilters(state: FilterState): FilterDimension[] {
  return state.dimensions.filter(d => !d.include);
}

// Convert new filter state to legacy API parameters for backward compatibility
export function toLegacyApiParams(state: FilterState): {
  genre?: string;
  subgenre?: string;
  tag?: string;
  tagAny?: string[];
} {
  const includeFilters = getIncludeFilters(state);
  
  const genres = getFiltersByType({ ...state, dimensions: includeFilters }, 'genre');
  const subgenres = getFiltersByType({ ...state, dimensions: includeFilters }, 'subgenre');
  const tags = getFiltersByType({ ...state, dimensions: includeFilters }, 'tag');
  
  const result: any = {};
  
  if (genres.length > 0) {
    result.genre = genres[0].name; // API expects genre name, not slug
  }
  
  if (subgenres.length > 0) {
    result.subgenre = subgenres[0].slug;
  }
  
  if (tags.length === 1) {
    result.tag = tags[0].slug;
  } else if (tags.length > 1) {
    result.tagAny = tags.map(t => t.slug);
  }
  
  return result;
}