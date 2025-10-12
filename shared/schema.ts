import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, uuid, vector, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Books table
export const books = pgTable("books", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  googleBooksId: text("google_books_id").unique(),
  title: text("title").notNull(),
  authors: text("authors").array().notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  publishedDate: text("published_date"),
  pageCount: integer("page_count"),
  categories: text("categories").array(),
  isbn: text("isbn"),
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

// Book embeddings table for vector similarity search
export const bookEmbeddings = pgTable(
  "book_embeddings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small dimensions
  },
  (table) => ({
    embeddingIndex: index("embedding_index").using("hnsw", table.embedding.op("vector_cosine_ops")),
  })
);

export const insertBookEmbeddingSchema = createInsertSchema(bookEmbeddings).omit({
  id: true,
});

export type InsertBookEmbedding = z.infer<typeof insertBookEmbeddingSchema>;
export type BookEmbedding = typeof bookEmbeddings.$inferSelect;

// User books (shelf management)
export const userBooks = pgTable("user_books", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  status: text("status", { 
    enum: ["reading", "completed", "on-hold", "dropped", "plan-to-read"] 
  }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertUserBookSchema = createInsertSchema(userBooks).omit({
  id: true,
  addedAt: true,
});

export type InsertUserBook = z.infer<typeof insertUserBookSchema>;
export type UserBook = typeof userBooks.$inferSelect;

// Custom shelves (user-defined shelf types)
export const customShelves = pgTable("custom_shelves", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  isEnabled: integer("is_enabled").notNull().default(1), // 1 = enabled, 0 = disabled
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomShelfSchema = createInsertSchema(customShelves).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomShelf = z.infer<typeof insertCustomShelfSchema>;
export type CustomShelf = typeof customShelves.$inferSelect;

// Browse category preferences
export const browseCategoryPreferences = pgTable("browse_category_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryType: text("category_type").notNull(), // 'genre', 'custom', 'system'
  categoryName: text("category_name").notNull(),
  categorySlug: text("category_slug").notNull(),
  isEnabled: integer("is_enabled").notNull().default(1),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBrowseCategoryPreferenceSchema = createInsertSchema(browseCategoryPreferences).omit({
  id: true,
  createdAt: true,
});

export type InsertBrowseCategoryPreference = z.infer<typeof insertBrowseCategoryPreferenceSchema>;
export type BrowseCategoryPreference = typeof browseCategoryPreferences.$inferSelect;
