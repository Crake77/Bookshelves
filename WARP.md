# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run dev          # Start development server with hot reload (http://localhost:8001)
npm run build        # Build for production (client + server)
npm start            # Start production server
```

### Database Operations  
```bash
npm run db:push      # Push schema changes to database
npm run db:push --force  # Force push (destructive - use with caution)
```

### Type Checking & Testing
```bash
npm run check        # Run TypeScript type checking
npm run e2e          # Run Playwright end-to-end tests
```

### Single Test Execution
```bash
npx playwright test e2e/mobile-book-dialog.spec.ts  # Run specific test file
npx playwright test --grep "mobile dialog"          # Run tests matching pattern
```

## Architecture Overview

### Tech Stack
- **Frontend**: React + TypeScript with Vite build system
- **Backend**: Express.js server with TypeScript 
- **Database**: PostgreSQL with pgvector extension for AI embeddings
- **AI**: OpenAI embeddings (text-embedding-3-small) + GPT-4o-mini for recommendations
- **ORM**: Drizzle ORM with full type safety
- **UI**: Tailwind CSS + Shadcn/ui components + Radix UI primitives
- **Mobile**: Progressive Web App optimized for iOS

### Project Structure
```
├── client/          # React frontend (Vite root)
│   ├── src/         # React components, pages, utilities 
│   └── index.html   # Entry point
├── server/          # Express backend
│   ├── index.ts     # Server entry point
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Database abstraction layer
│   └── vite.ts      # Vite integration
├── shared/          # Shared types and schemas
│   ├── schema.ts    # Drizzle database schemas
│   └── taxonomy.ts  # Genre/tag type definitions
├── db/              # Database connection setup
├── e2e/             # Playwright tests
├── api/             # Serverless function endpoints
└── public/          # Static PWA assets (manifest, SW, icons)
```

### Key Database Architecture
- **Vector Similarity Search**: Uses pgvector with HNSW indexing for AI recommendations
- **Complex Taxonomy System**: Hierarchical genres/subgenres with orthogonal cross-tags
- **Multi-shelf System**: Default shelves (Reading, Completed, etc.) + custom user shelves
- **Book Embeddings**: OpenAI embeddings stored as vectors for similarity matching

### API Architecture
- **RESTful Design**: Standard CRUD operations with proper HTTP methods
- **Graceful AI Degradation**: App functions even when OpenAI quota exceeded
- **Dual Search Sources**: Google Books API primary, Open Library fallback
- **Rate Limiting**: Built-in delays for batch embedding generation

## Development Guidelines

### Database Schema Changes
- Always use Drizzle migrations: modify `shared/schema.ts` then run `npm run db:push`
- Schema includes complex relationships - understand the taxonomy system before changes
- pgvector extension required for embeddings functionality

### AI Integration Patterns
- All OpenAI operations have fallback error handling
- Embedding generation is optional - app works without it
- Batch operations include quota-aware retry logic
- Use environment variable `OPENAI_API_KEY` for API access

### Path Aliases
- `@/*` → `./client/src/*` (Frontend imports)
- `@shared/*` → `./shared/*` (Shared type imports)
- `@assets/*` → `./attached_assets/*` (Asset imports)

### Testing Approach
- E2E tests use Playwright with mobile device simulation
- Tests require `PREVIEW_URL` environment variable
- Focus on mobile-first scenarios (iPhone viewport)
- Test critical user flows: book search, shelf management, rating

### Environment Setup Requirements
1. **DATABASE_URL**: PostgreSQL connection with pgvector extension enabled
2. **OPENAI_API_KEY**: Optional but required for AI features
3. **SESSION_SECRET**: Required for session management
4. **PREVIEW_URL**: Required for running E2E tests

### Mobile/PWA Considerations
- Mobile-first design using iOS-optimized viewport
- Service worker handles offline functionality
- Add to Home Screen support with proper manifest
- Touch-optimized UI components throughout

### Production Deployment
- Build outputs to `dist/` directory
- Server runs on port 8001 (configurable)
- Supports both development (Vite) and production (static) serving
- Uses esbuild for server bundling in production