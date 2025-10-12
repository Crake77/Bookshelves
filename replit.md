# BookShelf.ai

## Overview

BookShelf.ai is a mobile-first Progressive Web App (PWA) designed for tracking personal reading journeys with AI-powered book recommendations. The application uses OpenAI embeddings and vector similarity search to provide intelligent book suggestions based on users' reading histories. Built with a dark, AniList-inspired aesthetic, it features smart shelf organization, multi-source book search, and offline support through service workers.

## Recent Changes

### October 12, 2025
- ✅ Fixed service worker registration by adding static file serving middleware
- ✅ Implemented BookDetailDialog for adding books to shelves with status selection
- ✅ Added graceful error handling for OpenAI API quota limits (embeddings and rationales are optional)
- ✅ PWA install prompt now works correctly on iPhone
- ✅ E2E testing validated: search → book detail → add to shelf → verify in shelves
- ✅ Complete documentation with deployment instructions for Capacitor/Expo
- ✅ Redesigned Browse page with Netflix-style horizontal scrollable rows (Fantasy, Sci-Fi, Mystery, Romance, etc.)
- ✅ Added Settings page for customizing shelves and browse categories
- ✅ Implemented database schema for custom shelves and browse category preferences
- ✅ Created backend API routes for managing custom shelves and browse categories
- ✅ Implemented batch embedding generation with rate limiting (5 seconds between books, max 10 per batch)
- ✅ Added Profile page UI for monitoring and triggering embedding generation
- ✅ Graceful error handling for OpenAI quota limits - shows success/failure counts
- 🚧 TODO: Connect Settings page to persist preferences via backend APIs
- 🚧 TODO: Update Browse page to dynamically load categories based on user preferences

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety and component-based UI
- Tailwind CSS with Shadcn UI component library for consistent, dark-themed design
- TanStack Query (React Query) for server state management and data fetching
- Wouter for lightweight client-side routing
- Workbox for PWA service worker implementation

**Design System:**
- Dark-first visual language inspired by AniList
- Card-based information architecture with clear visual hierarchy
- Touch-optimized interactions with generous tap targets
- Custom color palette with purple/blue gradients and vibrant accents
- Typography: Inter for body text, Rubik for headings

**Key UI Patterns:**
- Bottom navigation bar for mobile-first experience
- Collapsible shelf sections for organizing books by status
- Book cards with cover images and status indicators
- AI recommendation cards with rationale display
- Search functionality with filter capabilities

### Backend Architecture

**Technology Stack:**
- Express.js with TypeScript for type-safe API development
- RESTful API design for book search, user books, and recommendations
- OpenAI API integration for generating embeddings and recommendation rationales

**API Endpoints:**
- `/api/search` - Multi-source book search (Google Books API with Open Library fallback)
- `/api/ingest` - Add books to database with embedding generation
- `/api/user-books/:userId` - CRUD operations for user's book collection
- `/api/recs/:userId` - AI-powered book recommendations using vector similarity

**Storage Layer:**
- DbStorage class implementing IStorage interface for data access abstraction
- Support for user management, book metadata, and user-book relationships
- Vector embedding storage and similarity search capabilities

### Data Architecture

**Database:**
- PostgreSQL with pgvector extension for vector similarity search
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL for cloud hosting

**Schema Design:**
- `users` table - User accounts with UUID primary keys
- `books` table - Book metadata including Google Books IDs, titles, authors, descriptions, cover images
- `user_books` table - Junction table tracking user reading lists with status (reading, completed, on-hold, dropped, plan-to-read)
- `book_embeddings` table - OpenAI embeddings (1536 dimensions) for vector similarity search

**Vector Search Strategy:**
- OpenAI text-embedding-3-small model for generating book embeddings
- Cosine similarity search using pgvector for finding related books
- Embeddings based on book title, authors, description, and categories

### PWA Implementation

**Service Worker:**
- Custom service worker with cache-first strategy for offline support
- Resource caching for essential app files
- Network-first fallback for API requests

**Installation:**
- Web App Manifest for Add to Home Screen functionality
- Support for iOS Safari with special handling
- Install prompt component for improved user experience

## External Dependencies

### Third-Party APIs

**OpenAI API:**
- Used for generating text embeddings (text-embedding-3-small model)
- Used for generating recommendation rationales via GPT models
- Requires API key configuration via environment variables

**Google Books API:**
- Primary source for book search and metadata
- Provides book information including titles, authors, descriptions, cover images, ISBN
- No API key required for basic usage

**Open Library API:**
- Fallback search provider when Google Books returns no results
- Alternative source for book covers and metadata
- Public API with no authentication required

### Database & Infrastructure

**Neon Serverless PostgreSQL:**
- Managed PostgreSQL database with pgvector extension
- WebSocket-based connections for serverless environments
- Configured via DATABASE_URL environment variable

**pgvector Extension:**
- PostgreSQL extension for vector similarity search
- Enables efficient cosine similarity calculations on embeddings
- Critical for AI recommendation functionality

### UI Component Libraries

**Radix UI:**
- Headless component primitives (dialogs, popovers, dropdowns, etc.)
- Provides accessible, unstyled components for building custom UI

**Shadcn UI:**
- Pre-built component library based on Radix UI and Tailwind
- Provides consistent design system components

**Embla Carousel:**
- Touch-friendly carousel implementation for mobile book browsing

### Development Tools

**Vite:**
- Frontend build tool and development server
- Handles React compilation and hot module replacement
- Configured with path aliases for clean imports

**Drizzle Kit:**
- Database migration and schema management tool
- Used for pushing schema changes to PostgreSQL