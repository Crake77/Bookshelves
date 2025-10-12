import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertUserBookSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google Books API search
async function searchGoogleBooks(query: string) {
  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`
  );
  const data = await response.json();
  
  return data.items?.map((item: any) => ({
    googleBooksId: item.id,
    title: item.volumeInfo.title,
    authors: item.volumeInfo.authors || ["Unknown Author"],
    description: item.volumeInfo.description || "",
    coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://") || null,
    publishedDate: item.volumeInfo.publishedDate || null,
    pageCount: item.volumeInfo.pageCount || null,
    categories: item.volumeInfo.categories || [],
    isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
  })) || [];
}

// Open Library API fallback
async function searchOpenLibrary(query: string) {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`
  );
  const data = await response.json();
  
  return data.docs?.map((doc: any) => ({
    googleBooksId: `ol-${doc.key}`,
    title: doc.title,
    authors: doc.author_name || ["Unknown Author"],
    description: doc.first_sentence?.join(" ") || "",
    coverUrl: doc.cover_i 
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    publishedDate: doc.first_publish_year?.toString() || null,
    pageCount: doc.number_of_pages_median || null,
    categories: doc.subject?.slice(0, 3) || [],
    isbn: doc.isbn?.[0] || null,
  })) || [];
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Generate recommendation rationale
async function generateRationale(userBooks: string[], recommendedBook: string): Promise<string> {
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

      let results = await searchGoogleBooks(query);
      
      // Fallback to Open Library if Google Books returns no results
      if (results.length === 0) {
        results = await searchOpenLibrary(query);
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
        if (book.description && process.env.OPENAI_API_KEY) {
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
      const recsWithRationale = await Promise.all(
        recommendations.map(async (book) => {
          try {
            const rationale = await generateRationale(userBookTitles, book.title);
            return { ...book, rationale };
          } catch (rationaleError: any) {
            // Fallback rationale if OpenAI fails
            console.warn("Failed to generate rationale (using fallback):", rationaleError.message);
            return { 
              ...book, 
              rationale: "A great match for your reading preferences based on similar themes and style."
            };
          }
        })
      );

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
      const { status } = req.body;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
