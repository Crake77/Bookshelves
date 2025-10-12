# BookShelf.ai Design Guidelines

## Design Approach

**Reference-Based: AniList-Inspired Book Tracking**

Taking direct inspiration from AniList's sophisticated anime tracking interface, BookShelf.ai will adapt its dark, immersive aesthetic for book lovers. AniList's strengths—clean card hierarchies, gradient overlays, excellent information density, and smooth mobile interactions—will be translated into a premium book discovery and tracking experience.

**Core Design Principles:**
- Dark-first visual language with depth through gradients and shadows
- Card-based information architecture with clear visual hierarchy
- Touch-optimized interactions with generous tap targets
- Content-density balance: detailed enough to be useful, spacious enough to breathe
- Vibrant accent colors against dark backgrounds for visual interest

## Color Palette

**Dark Mode Foundation:**
- Background Primary: 12 8% 8% (deep charcoal, almost black)
- Background Secondary: 220 10% 12% (slightly lighter panels/cards)
- Background Tertiary: 220 10% 16% (hover states, elevated elements)
- Surface: 220 12% 14% (card backgrounds)

**Gradient Overlays:**
- Hero/Header Gradient: Linear gradient from 250 60% 25% to 220 50% 15% (purple-blue gradient for headers)
- Card Accents: Subtle gradient overlays on book covers when no image (250 40% 30% to 220 40% 25%)

**Text Colors:**
- Primary Text: 0 0% 95% (near-white for headings and important text)
- Secondary Text: 0 0% 70% (medium gray for body text)
- Tertiary Text: 0 0% 50% (subdued gray for metadata, counts)

**Brand & Accent Colors:**
- Primary Accent: 250 70% 60% (vibrant purple for active states, CTAs)
- Secondary Accent: 210 80% 55% (bright blue for links, highlights)
- Success: 140 60% 50% (reading progress, completed items)
- Warning: 30 90% 60% (on-hold status)
- Error: 0 70% 55% (dropped/DNF status)

## Typography

**Font Families:**
- Primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif (clean, modern readability)
- Display: 'Rubik', sans-serif (slightly rounded for headings, adds personality)

**Type Scale:**
- Hero/Page Title: 28px/32px, Rubik SemiBold
- Section Headers: 20px/24px, Rubik Medium
- Card Titles: 16px/20px, Inter SemiBold
- Body Text: 14px/20px, Inter Regular
- Metadata/Counts: 12px/16px, Inter Medium
- Tab Labels: 11px/14px, Inter Medium (uppercase, letter-spacing: 0.5px)

## Layout System

**Spacing Primitives (Tailwind Units):**
Core spacing values: 2, 3, 4, 6, 8, 12, 16, 20
- Micro spacing: p-2, p-3 (card internal padding, tight gaps)
- Standard spacing: p-4, gap-4 (card padding, list gaps)
- Section spacing: p-6, py-8 (between major sections)
- Large spacing: p-12, py-16 (rare, for emphasis)

**Grid System:**
- Container: max-w-7xl mx-auto px-4 (mobile), px-6 (tablet)
- Book Grid: grid-cols-2 (mobile), grid-cols-3 (tablet), grid-cols-4+ (desktop)
- Gap spacing: gap-3 (mobile), gap-4 (tablet/desktop)

**Safe Areas:**
- Top: Account for status bar and header (h-14 + safe-area-inset-top)
- Bottom: Account for navigation tabs + home indicator (h-16 + safe-area-inset-bottom)

## Component Library

### Bottom Navigation (Fixed)
- Height: 64px (h-16) with rounded-t-2xl
- Background: Background Secondary with backdrop-blur-lg
- Three equal-width tabs with icons and labels
- Active state: Primary Accent color with subtle scale effect
- Inactive state: Tertiary Text color
- Haptic feedback on tap

### Header/Top Bar
- Height: 56px (h-14) with gradient background overlay
- Elements: Page title (left), filter icon (right), search icon (right)
- Sticky positioning with subtle shadow on scroll
- Gradient from Header Gradient colors

### Book Cards (Primary Component)
**Compact Card (Grid View):**
- Aspect ratio: 2:3 for cover
- Rounded: rounded-lg with shadow-lg
- Cover image fills card with gradient overlay at bottom
- Title overlay: absolute bottom, white text with shadow
- Author: text-xs, opacity-80
- Status badge: top-right corner, small pill shape

**Expanded Card (List View):**
- Horizontal layout: cover (80px width) + content
- Cover: rounded-md shadow-md
- Content padding: p-3
- Title: 2 lines max with ellipsis
- Metadata row: author, year, page count in Tertiary Text
- Progress bar for "Reading" status

### Status Shelves (Collapsible Sections)
- Section header: flex justify-between with title and count badge
- Count badge: rounded-full bg-Tertiary text-xs px-2 py-1
- Collapsible icon: chevron with rotate animation
- Divider: subtle line (border-Tertiary opacity-20)

### Filters & Search
- Search bar: rounded-full bg-Surface with icon prefix
- Filter chips: pill-shaped, multi-select with Primary Accent when active
- Smooth expand/collapse animation

### Genre Tags
- Pill-shaped badges: px-3 py-1 rounded-full
- Background: Surface with colored left border (2px)
- Border colors vary by genre (purple for fantasy, blue for sci-fi, etc.)

### AI Recommendation Cards
- Highlighted with subtle gradient border (Primary to Secondary Accent)
- "AI Recommended" badge at top with sparkle icon
- Rationale text: 1-2 lines in Secondary Text, italic
- Slightly elevated (shadow-xl)

### Profile Stats
- Grid of stat cards: 3 columns on mobile
- Each card: rounded-xl bg-Surface p-4
- Large number (Display font) with label below
- Icons with gradient fills

### Loading States
- Skeleton screens with shimmer animation
- Pulse effect on placeholders matching card dimensions
- Gradient shimmer from left to right

## Tab-Specific Layouts

### Shelves Tab
**Structure:**
1. Header with search and filter
2. Scrollable shelf sections (Reading, Completed, On Hold, Dropped, Plan to Read)
3. Each shelf: collapsible header + horizontal scroll or grid of books
4. Empty states with friendly illustrations and CTAs

### Browse Tab
**Structure:**
1. Hero carousel for featured/upcoming releases (full-width cards)
2. "Upcoming Releases" horizontal scroll
3. "Browse by Genre" grid (2 cols on mobile, 3+ on tablet)
4. "AI Recommended" section with rationale cards
5. All sections with "See All" links

### Username (Profile) Tab
**Structure:**
1. Profile header with avatar, username, stats summary
2. Reading activity timeline/calendar heatmap
3. Quick stats grid (books read this year, pages, etc.)
4. Favorite genres chart
5. Settings/preferences section

## Interaction Patterns

- Pull-to-refresh on all scrollable views
- Swipe gestures on cards (swipe left for options menu)
- Long-press on cards for quick actions
- Smooth page transitions with slide animations
- Bottom sheet modals for book details and actions
- Toast notifications for actions (added to shelf, etc.)

## Images

**Book Covers:**
- Primary visual element throughout the app
- Fetched from Google Books API (high quality preferred)
- Fallback gradient backgrounds with book emoji if no cover available
- Lazy loading with blur-up effect
- Aspect ratio maintained: 2:3

**Profile Avatars:**
- User profile pictures or auto-generated gradients with initials
- Circular format, 48px-80px depending on context

**Empty States:**
- Minimalist illustration or icon representing empty shelves
- Subdued colors matching the dark theme
- Centered with encouraging message

**No Hero Images:** The app is content-driven with book covers as the primary imagery. No large hero images needed—the gradient headers and book covers provide sufficient visual interest.