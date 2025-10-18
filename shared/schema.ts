import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, uuid, vector, index, boolean, real, uniqueIndex } from "drizzle-orm/pg-core";
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
  status: text("status"), // Supports both default and custom shelf slugs
  rating: integer("rating"), // User's rating 0-100
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertUserBookSchema = createInsertSchema(userBooks, {
  status: z.string().nullable().optional(),
}).omit({
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

// Book statistics (aggregated ratings and rankings)
export const bookStats = pgTable("book_stats", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookId: uuid("book_id").notNull().unique().references(() => books.id, { onDelete: "cascade" }),
  averageRating: integer("average_rating"), // Average of all user ratings (0-100)
  totalRatings: integer("total_ratings").notNull().default(0), // Count of ratings
  ranking: integer("ranking"), // Global ranking position (1 = highest rated)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBookStatsSchema = createInsertSchema(bookStats).omit({
  id: true,
  updatedAt: true,
});

export type InsertBookStats = z.infer<typeof insertBookStatsSchema>;
export type BookStats = typeof bookStats.$inferSelect;

// -----------------------
// Taxonomy (Genres/Tags)
// -----------------------

// Genre table
export const genres = pgTable("genres", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGenreSchema = createInsertSchema(genres).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGenre = z.infer<typeof insertGenreSchema>;
export type Genre = typeof genres.$inferSelect;

// Subgenre table (child of Genre)
export const subgenres = pgTable("subgenres", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubgenreSchema = createInsertSchema(subgenres).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubgenre = z.infer<typeof insertSubgenreSchema>;
export type Subgenre = typeof subgenres.$inferSelect;

// CrossTag table (orthogonal facets)
export const crossTags = pgTable("cross_tags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  group: text("group").notNull(), // e.g., tone_mood, setting, structure, tropes_themes, format, content_flags
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCrossTagSchema = createInsertSchema(crossTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrossTag = z.infer<typeof insertCrossTagSchema>;
export type CrossTag = typeof crossTags.$inferSelect;

// Age Market table
export const ageMarkets = pgTable("age_markets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgeMarketSchema = createInsertSchema(ageMarkets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgeMarket = z.infer<typeof insertAgeMarketSchema>;
export type AgeMarket = typeof ageMarkets.$inferSelect;

// -----------------------
// Book ↔ Taxonomy links
// -----------------------

// Each book can have a single primary subgenre (optional) with confidence
export const bookPrimarySubgenres = pgTable(
  "book_primary_subgenres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    subgenreId: uuid("subgenre_id").notNull().references(() => subgenres.id, { onDelete: "cascade" }),
    confidence: real("confidence"), // 0.0 - 1.0 (optional)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uqBook: uniqueIndex("uq_book_primary_subgenre_book").on(table.bookId),
  })
);

export const insertBookPrimarySubgenreSchema = createInsertSchema(bookPrimarySubgenres).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookPrimarySubgenre = z.infer<typeof insertBookPrimarySubgenreSchema>;
export type BookPrimarySubgenre = typeof bookPrimarySubgenres.$inferSelect;

// Candidate subgenres with confidence scores
export const bookSubgenreCandidates = pgTable(
  "book_subgenre_candidates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    subgenreId: uuid("subgenre_id").notNull().references(() => subgenres.id, { onDelete: "cascade" }),
    confidence: real("confidence").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uqBookSubgenre: uniqueIndex("uq_book_subgenre_candidate").on(table.bookId, table.subgenreId),
  })
);

export const insertBookSubgenreCandidateSchema = createInsertSchema(bookSubgenreCandidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookSubgenreCandidate = z.infer<typeof insertBookSubgenreCandidateSchema>;
export type BookSubgenreCandidate = typeof bookSubgenreCandidates.$inferSelect;

// Cross tag assignments (many-to-many)
export const bookCrossTags = pgTable(
  "book_cross_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    crossTagId: uuid("cross_tag_id").notNull().references(() => crossTags.id, { onDelete: "cascade" }),
    confidence: real("confidence"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uqBookCrossTag: uniqueIndex("uq_book_cross_tag").on(table.bookId, table.crossTagId),
  })
);

export const insertBookCrossTagSchema = createInsertSchema(bookCrossTags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookCrossTag = z.infer<typeof insertBookCrossTagSchema>;
export type BookCrossTag = typeof bookCrossTags.$inferSelect;

// Age market assignments (many-to-many)
export const bookAgeMarkets = pgTable(
  "book_age_markets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    ageMarketId: uuid("age_market_id").notNull().references(() => ageMarkets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uqBookAgeMarket: uniqueIndex("uq_book_age_market").on(table.bookId, table.ageMarketId),
  })
);

export const insertBookAgeMarketSchema = createInsertSchema(bookAgeMarkets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookAgeMarket = z.infer<typeof insertBookAgeMarketSchema>;
export type BookAgeMarket = typeof bookAgeMarkets.$inferSelect;
