import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertUserBookSchema, insertCustomShelfSchema, insertBrowseCategoryPreferenceSchema, books, bookEmbeddings } from "@shared/schema";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db/index";
import OpenAI from "openai";

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
    })
  : null;

// Find alternative cover for a book
async function findAlternativeCover(title: string, author?: string): Promise<string | null> {
  try {
    // Search for popular editions with covers
    const searchQuery = author ? `${title} ${author}` : title;
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&orderBy=relevance&maxResults=10`
    );
    const data = await response.json();
    
    // Find the first result with a cover image
    const bookWithCover = data.items?.find((item: any) => 
      item.volumeInfo.imageLinks?.thumbnail
    );
    
    if (bookWithCover?.volumeInfo.imageLinks?.thumbnail) {
      return bookWithCover.volumeInfo.imageLinks.thumbnail.replace("http://", "https://");
    }
    
    // Try Open Library as fallback
    const olResponse = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=10`
    );
    const olData = await olResponse.json();
    
    const olBookWithCover = olData.docs?.find((doc: any) => doc.cover_i);
    if (olBookWithCover?.cover_i) {
      return `https://covers.openlibrary.org/b/id/${olBookWithCover.cover_i}-M.jpg`;
    }
  } catch (error) {
    console.error("Error finding alternative cover:", error);
  }
  
  return null;
}

const GOOGLE_BOOKS_PAGE_SIZE = 20;
const OPEN_LIBRARY_PAGE_SIZE = 20;

// Google Books API search
async function searchGoogleBooks(query: string, startIndex: number = 0) {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${GOOGLE_BOOKS_PAGE_SIZE}&startIndex=${Math.max(0, startIndex)}`
  );
  const data = await response.json();
  
  const results = await Promise.all(
    (data.items || []).map(async (item: any) => {
      let coverUrl = item.volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://") || null;
      
      // If no cover found, try to find alternative cover
      if (!coverUrl && item.volumeInfo.title) {
        coverUrl = await findAlternativeCover(
          item.volumeInfo.title,
          item.volumeInfo.authors?.[0]
        );
      }
      
      // If still no cover, use placeholder pattern
      if (!coverUrl) {
        coverUrl = `placeholder:${encodeURIComponent(item.volumeInfo.title)}:${encodeURIComponent(item.volumeInfo.authors?.[0] || "Unknown Author")}`;
      }
      
      return {
        googleBooksId: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors || ["Unknown Author"],
        description: item.volumeInfo.description || "",
        coverUrl,
        publishedDate: item.volumeInfo.publishedDate || null,
        pageCount: item.volumeInfo.pageCount || null,
        categories: item.volumeInfo.categories || [],
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
      };
    })
  );
  
  return results;
}

// Open Library API fallback
async function searchOpenLibrary(query: string, startIndex: number = 0) {
  const offset = Math.max(0, startIndex);
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${OPEN_LIBRARY_PAGE_SIZE}&offset=${offset}`
  );
  const data = await response.json();
  
  const results = await Promise.all(
    (data.docs || []).map(async (doc: any) => {
      let coverUrl = doc.cover_i 
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null;
      
      // If no cover found, try to find alternative cover
      if (!coverUrl && doc.title) {
        coverUrl = await findAlternativeCover(
          doc.title,
          doc.author_name?.[0]
        );
      }
      
      // If still no cover, use placeholder pattern
      if (!coverUrl) {
        coverUrl = `placeholder:${encodeURIComponent(doc.title)}:${encodeURIComponent(doc.author_name?.[0] || "Unknown Author")}`;
      }
      
      return {
        googleBooksId: `ol-${doc.key}`,
        title: doc.title,
        authors: doc.author_name || ["Unknown Author"],
        description: doc.first_sentence?.join(" ") || "",
        coverUrl,
        publishedDate: doc.first_publish_year?.toString() || null,
        pageCount: doc.number_of_pages_median || null,
        categories: doc.subject?.slice(0, 3) || [],
        isbn: doc.isbn?.[0] || null,
      };
    })
  );
  
  return results;
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error("OpenAI API key is not configured");
  }
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Generate recommendation rationale
async function generateRationale(userBooks: string[], recommendedBook: string): Promise<string> {
  if (!openai) {
    return "Discover a new read based on similar favorites from your shelves.";
  }
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a book recommendation expert. Generate a 1-2 sentence rationale for why a user would enjoy a book based on their reading history. Be concise and compelling."
      },
      {
        role: "user",
        content: `User has enjoyed: ${userBooks.join(", ")}. Why would they like: ${recommendedBook}?`
      }
    ],
    max_tokens: 80,
  });
  return response.choices[0].message.content || "A great match for your reading preferences.";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Search for books (Google Books + Open Library fallback)
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const startIndex = Number.parseInt(req.query.startIndex as string ?? "0");
      const safeStartIndex = Number.isFinite(startIndex) && startIndex >= 0 ? startIndex : 0;

      let results = await searchGoogleBooks(query, safeStartIndex);
      
      // Fallback to Open Library if Google Books returns no results
      if (results.length === 0) {
        results = await searchOpenLibrary(query, safeStartIndex);
      }

      res.json(results);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to search books" });
    }
  });

  // Ingest a book and generate embeddings
  app.post("/api/ingest", async (req, res) => {
    try {
      const bookData = insertBookSchema.parse(req.body);
      
      // Check if book already exists
      let book = await storage.getBookByGoogleId(bookData.googleBooksId || "");
      
      if (!book) {
        // Create new book
        book = await storage.createBook(bookData);
        
        // Try to generate and store embedding if description exists (optional, graceful degradation)
        if (book.description && openai) {
          try {
            const embeddingText = `${book.title} by ${book.authors.join(", ")}. ${book.description}`;
            const embedding = await generateEmbedding(embeddingText);
            
            await storage.createBookEmbedding({
              bookId: book.id,
              embedding: embedding as any,
            });
          } catch (embeddingError: any) {
            // Log embedding error but don't fail the request
            console.warn("Failed to generate embedding (continuing without it):", embeddingError.message);
          }
        }
      }

      res.json(book);
    } catch (error) {
      console.error("Ingest error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to ingest book" });
    }
  });

  // Get AI-powered recommendations
  app.get("/api/recs", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Get user's completed and reading books
      const userBooks = await storage.getUserBooks(userId);
      const userBookIds = userBooks.map(ub => ub.bookId);

      if (userBooks.length === 0) {
        return res.json([]);
      }

      // Get embeddings for user's books
      const userEmbeddings = await Promise.all(
        userBookIds.slice(0, 5).map(id => storage.getBookEmbedding(id))
      );

      const validEmbeddings = userEmbeddings.filter(e => e !== undefined);
      
      // If no embeddings available (OpenAI quota exceeded), return empty recommendations
      if (validEmbeddings.length === 0) {
        console.warn("No embeddings available for recommendations");
        return res.json([]);
      }

      // Calculate average embedding
      const avgEmbedding = validEmbeddings[0]!.embedding.map((_, i) => {
        const sum = validEmbeddings.reduce((acc, emb) => acc + emb!.embedding[i], 0);
        return sum / validEmbeddings.length;
      });

      // Get similar books
      const recommendations = await storage.getSimilarBooks(avgEmbedding, 5, userBookIds);

      // Generate rationales for recommendations (with graceful fallback)
      const userBookTitles = userBooks.slice(0, 3).map(ub => ub.book.title);
      const recsWithRationale = openai
        ? await Promise.all(
            recommendations.map(async (book) => {
              try {
                const rationale = await generateRationale(userBookTitles, book.title);
                return { ...book, rationale };
              } catch (rationaleError: any) {
                // Fallback rationale if OpenAI fails
                console.warn("Failed to generate rationale (using fallback):", rationaleError.message);
                return {
                  ...book,
                  rationale: "A great match for your reading preferences based on similar themes and style.",
                };
              }
            })
          )
        : recommendations.map((book) => ({
            ...book,
            rationale: "A great match for your reading preferences based on similar themes and style.",
          }));

      res.json(recsWithRationale);
    } catch (error) {
      console.error("Recommendations error:", error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Get user's books by shelf
  app.get("/api/user-books/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const status = req.query.status as string | undefined;
      
      const userBooks = await storage.getUserBooks(userId, status);
      res.json(userBooks);
    } catch (error) {
      console.error("Get user books error:", error);
      res.status(500).json({ error: "Failed to get user books" });
    }
  });

  // Add book to user's shelf
  app.post("/api/user-books", async (req, res) => {
    try {
      const userBookData = insertUserBookSchema.parse(req.body);
      const userBook = await storage.addUserBook(userBookData);
      res.json(userBook);
    } catch (error) {
      console.error("Add user book error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add book to shelf" });
    }
  });

  // Update book status
  app.patch("/api/user-books/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, "status")) {
        return res.status(400).json({ error: "status is required" });
      }

      const rawStatus = (req.body as { status?: unknown }).status;
      if (rawStatus !== null && typeof rawStatus !== "string") {
        return res.status(400).json({ error: "status must be string or null" });
      }

      const status = rawStatus === null || rawStatus === "" ? null : (rawStatus as string);
      
      const userBook = await storage.updateUserBookStatus(id, status);
      if (!userBook) {
        return res.status(404).json({ error: "User book not found" });
      }
      
      res.json(userBook);
    } catch (error) {
      console.error("Update user book error:", error);
      res.status(500).json({ error: "Failed to update book status" });
    }
  });

  // Remove book from shelf
  app.delete("/api/user-books/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeUserBook(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove user book error:", error);
      res.status(500).json({ error: "Failed to remove book from shelf" });
    }
  });

  // Update book rating
  app.patch("/api/user-books/:id/rating", async (req, res) => {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      
      if (typeof rating !== 'number' || rating < 0 || rating > 100) {
        return res.status(400).json({ error: "Rating must be a number between 0 and 100" });
      }
      
      const userBook = await storage.updateUserBookRating(id, rating);
      if (!userBook) {
        return res.status(404).json({ error: "User book not found" });
      }
      
      res.json(userBook);
    } catch (error) {
      console.error("Update rating error:", error);
      res.status(500).json({ error: "Failed to update rating" });
    }
  });

  // Book Stats API
  app.get("/api/book-stats/:bookId", async (req, res) => {
    try {
      const { bookId } = req.params;
      const stats = await storage.getBookStats(bookId);
      res.json(stats || { averageRating: null, totalRatings: 0, ranking: null });
    } catch (error) {
      console.error("Get book stats error:", error);
      res.status(500).json({ error: "Failed to get book stats" });
    }
  });

  // Custom Shelves API
  app.get("/api/custom-shelves/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const shelves = await storage.getCustomShelves(userId);
      res.json(shelves);
    } catch (error) {
      console.error("Get custom shelves error:", error);
      res.status(500).json({ error: "Failed to get custom shelves" });
    }
  });

  app.post("/api/custom-shelves", async (req, res) => {
    try {
      const shelfData = insertCustomShelfSchema.parse(req.body);
      const shelf = await storage.createCustomShelf(shelfData);
      res.json(shelf);
    } catch (error) {
      console.error("Create custom shelf error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create custom shelf" });
    }
  });

  app.patch("/api/custom-shelves/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const shelf = await storage.updateCustomShelf(id, req.body);
      if (!shelf) {
        return res.status(404).json({ error: "Custom shelf not found" });
      }
      res.json(shelf);
    } catch (error) {
      console.error("Update custom shelf error:", error);
      res.status(500).json({ error: "Failed to update custom shelf" });
    }
  });

  app.delete("/api/custom-shelves/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCustomShelf(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete custom shelf error:", error);
      res.status(500).json({ error: "Failed to delete custom shelf" });
    }
  });

  // Browse Categories API
  app.get("/api/browse-categories/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const categories = await storage.getBrowseCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error("Get browse categories error:", error);
      res.status(500).json({ error: "Failed to get browse categories" });
    }
  });

  app.post("/api/browse-categories", async (req, res) => {
    try {
      const categoryData = insertBrowseCategoryPreferenceSchema.parse(req.body);
      const category = await storage.createBrowseCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Create browse category error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create browse category" });
    }
  });

  app.patch("/api/browse-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateBrowseCategory(id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Browse category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Update browse category error:", error);
      res.status(500).json({ error: "Failed to update browse category" });
    }
  });

  app.delete("/api/browse-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBrowseCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete browse category error:", error);
      res.status(500).json({ error: "Failed to delete browse category" });
    }
  });

  // Batch job to generate embeddings for books without them
  app.post("/api/batch/generate-embeddings", async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          error: "OpenAI API key is not configured",
          quotaExceeded: false,
        });
      }

      const { delayMs = 5000, limit = 10 } = req.body; // Default: 5 seconds between each, max 10 books
      
      // Get books without embeddings
      const booksWithoutEmbeddings = await db.execute(sql`
        SELECT b.* FROM ${books} b
        LEFT JOIN ${bookEmbeddings} be ON b.id = be.book_id
        WHERE be.id IS NULL AND b.description IS NOT NULL
        LIMIT ${limit}
      `);

      const results: any[] = [];
      let successCount = 0;
      let errorCount = 0;
      let quotaExceededCount = 0;
      const maxConsecutive429s = 2; // Stop after 2 consecutive 429s

      for (const book of (booksWithoutEmbeddings.rows as any[])) {
        // Abort if we've hit quota limit repeatedly
        if (quotaExceededCount >= maxConsecutive429s) {
          console.log(`⚠ Stopping batch job - OpenAI quota exceeded ${quotaExceededCount} times`);
          results.push({
            bookId: null,
            title: "Batch aborted",
            status: "aborted",
            error: "OpenAI quota exceeded - please try again later or upgrade your quota"
          });
          break;
        }

        try {
          // Rate limiting delay
          if (results.length > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          const embeddingText = `${book.title} by ${book.authors?.join(", ")}. ${book.description}`;
          const embedding = await generateEmbedding(embeddingText);
          
          await storage.createBookEmbedding({
            bookId: book.id,
            embedding: embedding as any,
          });

          results.push({ bookId: book.id, title: book.title, status: "success" });
          successCount++;
          quotaExceededCount = 0; // Reset on success
          console.log(`✓ Generated embedding for: ${book.title}`);
        } catch (embeddingError: any) {
          const is429 = embeddingError.message?.includes("429") || embeddingError.message?.includes("quota");
          if (is429) {
            quotaExceededCount++;
          } else {
            quotaExceededCount = 0; // Reset if it's not a quota error
          }
          
          results.push({ bookId: book.id, title: book.title, status: "error", error: embeddingError.message });
          errorCount++;
          console.error(`✗ Failed to generate embedding for: ${book.title}`, embeddingError.message);
        }
      }

      res.json({
        message: quotaExceededCount >= maxConsecutive429s 
          ? "Batch job aborted due to quota limits"
          : "Batch job completed",
        totalProcessed: results.length,
        successCount,
        errorCount,
        quotaExceeded: quotaExceededCount >= maxConsecutive429s,
        results,
      });
    } catch (error) {
      console.error("Batch embedding generation error:", error);
      res.status(500).json({ error: "Failed to run batch embedding job" });
    }
  });

  // Get books without embeddings (for monitoring)
  app.get("/api/books/missing-embeddings", async (req, res) => {
    try {
      const booksWithoutEmbeddings = await db.execute(sql`
        SELECT b.id, b.title, b.authors, b.description 
        FROM ${books} b
        LEFT JOIN ${bookEmbeddings} be ON b.id = be.book_id
        WHERE be.id IS NULL
      `);

      res.json({
        count: booksWithoutEmbeddings.rows.length,
        books: booksWithoutEmbeddings.rows,
      });
    } catch (error) {
      console.error("Get books without embeddings error:", error);
      res.status(500).json({ error: "Failed to get books without embeddings" });
    }
  });

  // Fix missing covers for existing books
  app.post("/api/books/fix-covers", async (req, res) => {
    try {
      // Get books with missing or placeholder covers
      const booksWithoutCovers = await db.execute(sql`
        SELECT * FROM ${books} 
        WHERE cover_url IS NULL OR cover_url LIKE 'placeholder:%'
      `);

      const results: any[] = [];
      
      for (const book of (booksWithoutCovers.rows as any[])) {
        try {
          // Try to find alternative cover
          const coverUrl = await findAlternativeCover(book.title, book.authors?.[0]);
          
          if (coverUrl) {
            await db.execute(sql`
              UPDATE ${books} 
              SET cover_url = ${coverUrl}
              WHERE id = ${book.id}
            `);
            results.push({ bookId: book.id, title: book.title, status: "success", coverUrl });
          } else {
            // Set placeholder
            const placeholderUrl = `placeholder:${encodeURIComponent(book.title)}:${encodeURIComponent(book.authors?.[0] || "Unknown Author")}`;
            await db.execute(sql`
              UPDATE ${books} 
              SET cover_url = ${placeholderUrl}
              WHERE id = ${book.id}
            `);
            results.push({ bookId: book.id, title: book.title, status: "placeholder", coverUrl: placeholderUrl });
          }
        } catch (error: any) {
          results.push({ bookId: book.id, title: book.title, status: "error", error: error.message });
        }
      }

      res.json({
        message: "Cover fix job completed",
        totalProcessed: results.length,
        results,
      });
    } catch (error) {
      console.error("Fix covers error:", error);
      res.status(500).json({ error: "Failed to fix book covers" });
    }
  });

  // -----------------------
  // Works & Editions Routes (Publication Dating System)
  // -----------------------
  
  const { browseWorks, getWorkDetails, getWorkEditions } = await import("./lib/editions-api.js");
  
  // Browse works (new endpoint for edition-aware browsing)
  app.get("/api/works/browse", async (req, res) => {
    try {
      const sort = req.query.sort as "original" | "latestMajor" | "latestAny" | "title" | undefined;
      const recentDays = req.query.recentDays ? parseInt(req.query.recentDays as string) : 90;
      const userId = req.query.userId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Get user's book IDs to exclude
      let excludeUserBookIds: string[] = [];
      if (userId) {
        const userBooks = await storage.getUserBooks(userId);
        excludeUserBookIds = userBooks.map(ub => ub.bookId);
      }
      
      const worksList = await browseWorks({
        sort,
        recentDays,
        excludeUserBookIds,
        limit,
        offset,
      });
      
      res.json(worksList);
    } catch (error) {
      console.error("Browse works error:", error);
      res.status(500).json({ error: "Failed to browse works" });
    }
  });
  
  // Get work details with all editions
  app.get("/api/works/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const work = await getWorkDetails(id);
      
      if (!work) {
        return res.status(404).json({ error: "Work not found" });
      }
      
      res.json(work);
    } catch (error) {
      console.error("Get work error:", error);
      res.status(500).json({ error: "Failed to get work" });
    }
  });
  
  // Get all editions for a work
  app.get("/api/works/:id/editions", async (req, res) => {
    try {
      const { id } = req.params;
      const editionsList = await getWorkEditions(id);
      res.json(editionsList);
    } catch (error) {
      console.error("Get editions error:", error);
      res.status(500).json({ error: "Failed to get editions" });
    }
  });

  // Get editions by Google Books ID (for cover selection)
  app.get("/api/books/:googleBooksId/editions", async (req, res) => {
    try {
      const { googleBooksId } = req.params;
      const { editions } = await import("@shared/schema.js");
      const { works } = await import("@shared/schema.js");
      const { eq, or } = await import("drizzle-orm");
      
      // Find edition by googleBooksId
      const edition = await db
        .select()
        .from(editions)
        .where(eq(editions.googleBooksId, googleBooksId))
        .limit(1)
        .execute();
      
      if (edition.length === 0) {
        return res.json([]);
      }
      
      const workId = edition[0].workId;
      
      // Get all editions for this work
      const editionsList = await getWorkEditions(workId);
      
      // Filter to only high-quality covers (no scans)
      const qualityEditions = editionsList.filter(e => {
        if (!e.coverUrl) return false;
        const url = e.coverUrl.toLowerCase();
        return !url.includes('edge=curl') && !url.includes('edge=shadow');
      });
      
      // If no quality editions, return all (user can still see them)
      res.json(qualityEditions.length > 0 ? qualityEditions : editionsList);
    } catch (error) {
      console.error("Get editions error:", error);
      res.status(500).json({ error: "Failed to get editions" });
    }
  });

  // Get series info for a book
  app.get("/api/books/:googleBooksId/series-info", async (req, res) => {
    try {
      const { googleBooksId } = req.params;
      const { editions, works } = await import("@shared/schema.js");
      const { eq, and, isNotNull, sql } = await import("drizzle-orm");
      
      // Find edition by googleBooksId
      const edition = await db
        .select({ workId: editions.workId })
        .from(editions)
        .where(eq(editions.googleBooksId, googleBooksId))
        .limit(1)
        .execute();
      
      if (edition.length === 0) {
        return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId: null });
      }
      
      const workId = edition[0].workId;
      
      // Get work info
      const work = await db
        .select({
          series: works.series,
          seriesOrder: works.seriesOrder,
        })
        .from(works)
        .where(eq(works.id, workId))
        .limit(1)
        .execute();
      
      if (work.length === 0 || !work[0].series) {
        return res.json({ series: null, seriesOrder: null, totalBooksInSeries: null, workId });
      }
      
      const seriesName = work[0].series;
      const seriesOrder = work[0].seriesOrder;
      
      // Count total books in main sequence (seriesOrder IS NOT NULL)
      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(works)
        .where(
          and(
            eq(works.series, seriesName),
            isNotNull(works.seriesOrder)
          )
        )
        .execute();
      
      const totalBooksInSeries = totalCount[0]?.count || null;
      
      res.json({
        series: seriesName,
        seriesOrder,
        totalBooksInSeries,
        workId,
      });
    } catch (error) {
      console.error("Get series info error:", error);
      res.status(500).json({ error: "Failed to get series info" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
