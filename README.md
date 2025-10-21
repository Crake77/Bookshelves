# BookShelf.ai 📚

A mobile-first Progressive Web App for tracking your reading journey with AI-powered book recommendations using OpenAI embeddings and vector similarity search.

## Features

- 📱 **Mobile-First PWA** - Optimized for iPhone with Add to Home Screen support
- 🤖 **AI Recommendations** - Powered by OpenAI embeddings and pgvector cosine similarity
- 📚 **Smart Shelves** - Organize books into Reading, Completed, On Hold, Dropped, and Plan to Read
- 🔍 **Multi-Source Search** - Google Books API with Open Library fallback
- 🌙 **Dark Theme** - AniList-inspired sleek interface
- ⚡ **Offline Support** - Service worker for offline access

## Tech Stack

### Frontend
- React + TypeScript
- Tailwind CSS + Shadcn UI
- TanStack Query for data fetching
- Wouter for routing
- Workbox for PWA service worker

### Backend
- Express.js + TypeScript
- PostgreSQL with pgvector extension
- OpenAI API for embeddings and rationales
- Google Books API + Open Library API

### Database
- PostgreSQL (Neon) with pgvector for vector similarity
- Drizzle ORM for type-safe database operations

## Getting Started

### Prerequisites

1. **Database**: PostgreSQL with pgvector extension
2. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/database
   OPENAI_API_KEY=sk-...
   SESSION_SECRET=your-secret-key-here
   ```

### Database Setup

1. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Run the schema:
   ```bash
   npm run db:push
   ```

   Or manually execute `SCHEMA.sql`:
   ```bash
   psql $DATABASE_URL < SCHEMA.sql
   ```

### Installation

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5000`

## API Endpoints

### Book Search
```bash
GET /api/search?q=query
```
Searches Google Books API with Open Library fallback.

### Book Ingestion
```bash
POST /api/ingest
Content-Type: application/json

{
  "googleBooksId": "string",
  "title": "string",
  "authors": ["string"],
  "description": "string",
  ...
}
```
Adds a book to the database and generates OpenAI embeddings.

### AI Recommendations
```bash
GET /api/recs?userId=uuid
```
Returns AI-powered book recommendations using vector similarity and generates rationales.

### User Books Management
```bash
GET /api/user-books/:userId
POST /api/user-books
PATCH /api/user-books/:id
DELETE /api/user-books/:id
```

## Deploying to iOS App Store

### Using Capacitor

1. **Install Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios
   npx cap init
   ```

2. **Configure Capacitor** (`capacitor.config.ts`):
   ```typescript
   import { CapacitorConfig } from '@capacitor/cli';

   const config: CapacitorConfig {
     appId: 'ai.bookshelf.app',
     appName: 'BookShelf.ai',
     webDir: 'dist',
     server: {
       url: 'https://your-replit-url.replit.app',
       cleartext: true
     }
   };

   export default config;
   ```

3. **Build the web app**:
   ```bash
   npm run build
   ```

4. **Add iOS platform**:
   ```bash
   npx cap add ios
   ```

5. **Sync assets**:
   ```bash
   npx cap sync
   ```

6. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

7. **Configure in Xcode**:
   - Set your Development Team
   - Configure Bundle Identifier
   - Add app icons and splash screens
   - Configure capabilities (if needed)

8. **Build and submit**:
   - Archive the app (Product → Archive)
   - Upload to App Store Connect
   - Submit for TestFlight/App Review

### Using Expo (Alternative)

1. **Install Expo**:
   ```bash
   npx create-expo-app bookshelf-mobile --template blank-typescript
   ```

2. **Add WebView**:
   ```bash
   npx expo install react-native-webview
   ```

3. **Configure WebView** (`App.tsx`):
   ```tsx
   import { WebView } from 'react-native-webview';
   
   export default function App() {
     return (
       <WebView 
         source={{ uri: 'https://your-replit-url.replit.app' }}
         style={{ flex: 1 }}
       />
     );
   }
   ```

4. **Build for iOS**:
   ```bash
   eas build --platform ios
   ```

5. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

## PWA Installation (iPhone)

### Add to Home Screen (Safari)
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to install

The app will now function like a native iOS app with:
- Standalone display mode
- No browser UI
- App icon on home screen
- Offline support via service worker

## Production Deployment

### Replit Deployment
1. Click "Deploy" in Replit
2. Your app will be available at `https://your-repl.replit.app`

### Custom Domain
1. Configure custom domain in Replit
2. Update `capacitor.config.ts` server URL
3. Rebuild and redeploy iOS app

## Environment Variables for Production

Make sure to set these in your production environment:
- `DATABASE_URL` - Production PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_SECRET` - Secure random string

## Development

### Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   └── lib/         # API client and utilities
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   └── storage.ts       # Database layer
├── shared/              # Shared types and schemas
│   └── schema.ts        # Drizzle schemas
├── db/                  # Database setup
│   └── index.ts         # Database connection
├── public/              # Static assets
│   ├── manifest.json    # PWA manifest
│   └── sw.js           # Service worker
└── SCHEMA.sql          # Database schema
```

### Database Migrations

Use Drizzle to manage schema changes:
```bash
npm run db:push        # Push schema to database
npm run db:push --force # Force push (use with caution)
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, and OpenAI
