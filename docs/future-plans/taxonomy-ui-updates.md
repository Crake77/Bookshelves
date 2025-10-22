# Taxonomy UI Updates - Future Development Plan

## Overview
With the new hierarchical taxonomy system in place, the Browse and Settings screens need UI updates to properly utilize the expanded metadata structure.

## Current State
- Browse and Settings pages have "+add subgenre/tags" functionality
- Limited to subgenres and cross-tags only
- Flat search/selection interface

## Needed Updates

### 1. Browse Page Enhancements
- **Expandable Taxonomy Sections**: Replace simple "+add subgenre/tags" with collapsible sections:
  - 📂 **Domains** (Fiction/Nonfiction) - Top-level filter
  - 📚 **Supergenres** - Umbrella categories for browsing
  - 🎭 **Genres** - Primary classification (current behavior)
  - 🏷️ **Subgenres** - Specific classification (current behavior)  
  - 📖 **Formats** - Physical/structural form (novel, manga, etc.)
  - 👶 **Age Markets** - Target audience (YA, adult, etc.)
  - 🔖 **Cross-tags** - Tropes, themes, settings, moods (current behavior)

### 2. Settings Page Enhancements
- **Metadata Management Interface**: Allow users to:
  - Set preferences for each taxonomy level
  - Configure which dimensions to show/hide in Browse
  - Bulk edit book classifications across all dimensions
  - Import/export taxonomy mappings

### 3. Advanced Filtering UI
- **Hierarchical Filters**: 
  - Start broad (Domain → Supergenre) then narrow down
  - Auto-suggest related categories based on selection
  - Visual hierarchy indicators (indentation, colors)
  
- **Multi-dimensional Search**:
  - Genre + Format combinations (e.g., "Fantasy Manga")
  - Age Market + Theme combinations (e.g., "YA Enemies-to-Lovers")
  - Advanced boolean logic for power users

### 4. Carousel Search Updates
The dependent carousel search features need updates to handle:
- **Hierarchical Navigation**: Drill down from Domain → Supergenre → Genre → Subgenre
- **Cross-dimensional Filtering**: Combine genres with formats, age markets, themes
- **Smart Suggestions**: Recommend related categories based on current selection
- **Breadcrumb Navigation**: Show current filter path clearly

### 5. User Experience Considerations
- **Progressive Disclosure**: Simple by default, detailed on demand
- **Collapsible Sections**: Let users focus on dimensions they care about
- **Quick Actions**: Common combinations as presets
- **Search Within Categories**: Filter long lists (e.g., 456 subgenres)

## Implementation Priority
1. **Phase 1**: Basic hierarchical browsing (Domain → Genre → Subgenre)
2. **Phase 2**: Add Format and Age Market selection
3. **Phase 3**: Advanced multi-dimensional filtering
4. **Phase 4**: User customization and preferences

## Technical Notes
- New taxonomy-list API already supports all dimensions
- UI components need to handle nested/hierarchical data
- Consider virtualization for large taxonomy lists
- Maintain backward compatibility during transition

## Design Mockup Ideas
```
Browse Page Layout:
┌─ Content Type ─┐ ┌─ Formats ──────┐ ┌─ Age Market ─┐
│ ○ Fiction      │ │ ☐ Novel        │ │ ○ Adult      │
│ ○ Nonfiction   │ │ ☐ Manga        │ │ ○ Young Adult│
│ ○ All          │ │ ☐ Graphic Novel│ │ ○ All Ages   │
└────────────────┘ └────────────────┘ └──────────────┘

┌─ Fantasy Subgenres ──────┐ ┌─ Themes & Tropes ─────────┐
│ ☐ Epic Fantasy          │ │ ☐ Enemies to Lovers       │
│ ☐ Urban Fantasy         │ │ ☐ Found Family            │
│ ☐ Cozy Fantasy          │ │ ☐ Time Travel             │
│ ▼ Show More (12)        │ │ ▼ Show More (47)          │
└─────────────────────────┘ └───────────────────────────┘
```

This will provide a much richer, more intuitive browsing experience while leveraging the full power of our hierarchical taxonomy system.