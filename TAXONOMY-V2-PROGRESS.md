# Taxonomy Filter V2 - Implementation Progress

## Design Specifications

### UI Requirements
- **Remove legacy interface** - Only modern compact design
- **Genre/Subgenre always visible** - No hiding/collapsing
- **Chips show carousel format** - Genre (large), Subgenre (medium), Tags (small)
- **Pencil icon pattern** - All sections have pencil to open editors
- **Modal selection flow** - Search bar + scrollable lists
- **Auto-population** - Domain/Supergenre fill based on genre
- **Hierarchical filtering** - Top-down (domain→genre) and bottom-up (genre→domain)
- **Hidden advanced sections** - Domain, Supergenre, Content Flags, Format, Audience, Block

## ✅ Completed (TaxonomyFilterV2.tsx)

### Core Structure
- [x] Compact display with section headers
- [x] Pencil icon UI pattern
- [x] FilterChip component with size variants (genre/subgenre/tag/normal)
- [x] SectionHeader component with edit + toggle visibility
- [x] Genre-subgenre pairing logic

### Genre/Subgenre Section
- [x] "Genre / Subgenre" header with pencil icon
- [x] Genre chips displayed in large font (font-display)
- [x] Subgenre chips beneath in medium font
- [x] Two-stage modal selector (genre first, then subgenre)
- [x] Search functionality in modal
- [x] "No subgenre" option
- [x] "Back to Genres" button
- [x] Remove individual or paired items
- [x] Allow multiple genre-subgenre combos

### Tags Section
- [x] "Tropes / Themes / Tags" header with pencil icon
- [x] Modal with search + word bank
- [x] Genre-aware tag filtering
- [x] Toggle selection on/off
- [x] Small font display for tag chips

### Domain Section (Partial)
- [x] Hidden by default with chevron toggle
- [x] Chip display when visible
- [ ] Auto-population based on selected genres
- [ ] Pencil icon to manually select
- [ ] Filter genres when domain selected first

## 🚧 In Progress / To Do

### Supergenre Section
- [ ] Hidden by default with chevron toggle
- [ ] Auto-populate based on genre selection
- [ ] Pencil icon for manual selection
- [ ] Filter genres when supergenre selected first
- [ ] Chip display

### Content Flags Section
- [ ] Hidden by default with chevron toggle
- [ ] Pencil icon opens modal
- [ ] Search + word bank interface (like tags)
- [ ] Small chip display

### Format Section
- [ ] Hidden by default with chevron toggle
- [ ] Pencil icon for selection
- [ ] Chip display
- [ ] Grid/button layout for formats

### Audience (Age Market) Section
- [ ] Hidden by default with chevron toggle
- [ ] Pencil icon for selection
- [ ] Chip display
- [ ] List/button layout for age ranges

### Block Section
- [ ] Hidden by default with chevron toggle
- [ ] Pencil icon opens modal
- [ ] Word bank shows BOTH tags AND content flags
- [ ] Red chip styling for blocked items
- [ ] Search functionality

### Advanced Features
- [ ] Domain auto-population logic (based on genre taxonomy data)
- [ ] Supergenre auto-population logic
- [ ] Hierarchical filtering (domain/supergenre → filter genres)
- [ ] Cascade deletion (remove domain → reset genres/subgenres)
- [ ] Multi-domain support (genres that span Fiction/Nonfiction)

### Integration
- [ ] Replace old TaxonomyFilter with V2 in BrowsePage
- [ ] Replace old TaxonomyFilter with V2 in SettingsPage
- [ ] Remove legacy interface code completely
- [ ] Update useTaxonomyFilter hook if needed
- [ ] Test cross-page persistence

## Technical Architecture

### Component Structure
```
TaxonomyFilterV2 (main)
├── FilterChip (display)
├── SectionHeader (with pencil + toggle)
├── GenreSubgenreSelector (modal)
├── TagSelector (modal)
├── DomainSelector (modal) - TODO
├── SupergenreSelector (modal) - TODO
├── ContentFlagSelector (modal) - TODO
├── FormatSelector (modal) - TODO
├── AudienceSelector (modal) - TODO
└── BlockSelector (modal) - TODO
```

### Data Flow
1. User clicks pencil icon
2. Modal opens with search + scrollable list
3. User selects item(s)
4. Save updates filterState
5. Chips display updated selections
6. Auto-population triggers for dependent fields
7. Hierarchical filters update available options

### State Management
- `filterState` from parent (useTaxonomyFilter)
- Modal open/close states (local)
- Section visibility states (local)
- Taxonomy data (loaded once, cached)
- Auto-populated values (computed from selections)

## Design Decisions

### Chip Sizing
- **Genre**: `text-lg font-display font-bold` - Most prominent
- **Subgenre**: `text-base font-semibold` - Secondary prominence
- **Tags**: `text-xs` - Tertiary, compact
- **Normal**: `text-sm` - Default for other dimensions

### Color Scheme
- **Include filters**: `bg-primary/15 text-primary border-primary/30`
- **Block filters**: `bg-destructive/15 text-destructive border-destructive/30`
- **Hover states**: Subtle background changes
- **Selected in modals**: Primary color with font-medium

### Interaction Patterns
- Click pencil → Open modal
- Click chip X → Remove filter
- Click chevron → Toggle section visibility
- Search → Filter available options in real-time
- Select item → Immediate visual feedback

## Next Steps

1. **Complete remaining selectors** (Content Flags, Format, Audience, Block)
2. **Implement auto-population logic** for Domain/Supergenre
3. **Add hierarchical filtering** (top-down and bottom-up)
4. **Remove legacy code** from Browse and Settings
5. **Integration testing** across both pages
6. **Deploy to production**