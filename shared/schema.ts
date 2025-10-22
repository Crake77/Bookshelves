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
// Hierarchical Taxonomy System
// -----------------------

// Domain: top-level binary classification (fiction/nonfiction)
export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertDomainSchema = createInsertSchema(domains).omit({
  id: true,
});
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;

// Supergenre: umbrella categories grouping related genres
export const supergenres = pgTable("supergenres", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertSupergenreSchema = createInsertSchema(supergenres).omit({
  id: true,
});
export type InsertSupergenre = z.infer<typeof insertSupergenreSchema>;
export type Supergenre = typeof supergenres.$inferSelect;

// Genre: primary classification exposed to users
export const genres = pgTable(
  "genres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    idxGenresEnabledTrue: index("idx_genres_enabled_true").on(table.enabled).where(sql`enabled = true`),
  })
);

export const insertGenreSchema = createInsertSchema(genres).omit({
  id: true,
});
export type InsertGenre = z.infer<typeof insertGenreSchema>;
export type Genre = typeof genres.$inferSelect;

// Subgenre: most specific classification
export const subgenres = pgTable(
  "subgenres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    idxSubgenresGenre: index("idx_subgenres_genre").on(table.genreId),
    idxSubgenresEnabledTrue: index("idx_subgenres_enabled_true").on(table.enabled).where(sql`enabled = true`),
  })
);

export const insertSubgenreSchema = createInsertSchema(subgenres).omit({
  id: true,
});
export type InsertSubgenre = z.infer<typeof insertSubgenreSchema>;
export type Subgenre = typeof subgenres.$inferSelect;

// Format: structural/physical form of the work
export const formats = pgTable("formats", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(true),
});

export const insertFormatSchema = createInsertSchema(formats).omit({
  id: true,
});
export type InsertFormat = z.infer<typeof insertFormatSchema>;
export type Format = typeof formats.$inferSelect;

// Age Markets: target readership age ranges
export const ageMarkets = pgTable(
  "age_markets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    idxAgeMarketsEnabledTrue: index("idx_age_markets_enabled_true").on(table.enabled).where(sql`enabled = true`),
  })
);

export const insertAgeMarketSchema = createInsertSchema(ageMarkets).omit({
  id: true,
});
export type InsertAgeMarket = z.infer<typeof insertAgeMarketSchema>;
export type AgeMarket = typeof ageMarkets.$inferSelect;

// Cross-tags: orthogonal attributes (tropes, themes, settings, mood, structure, content flags)
export const crossTags = pgTable(
  "cross_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    group: text("group").notNull().$type<'tropes_themes' | 'setting' | 'tone_mood' | 'structure' | 'content_flags'>(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    idxCrossTagsGroup: index("idx_cross_tags_group").on(table.group),
    idxCrossTagsEnabledTrue: index("idx_cross_tags_enabled_true").on(table.enabled).where(sql`enabled = true`),
  })
);

export const insertCrossTagSchema = createInsertSchema(crossTags).omit({
  id: true,
});
export type InsertCrossTag = z.infer<typeof insertCrossTagSchema>;
export type CrossTag = typeof crossTags.$inferSelect;

// Aliases: alternative terms mapped to canonical slugs
export const aliases = pgTable(
  "aliases",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    kind: text("kind").notNull().$type<'genre' | 'subgenre' | 'tag' | 'format' | 'supergenre'>(),
    alias: text("alias").notNull(),
    canonicalSlug: text("canonical_slug").notNull(),
  },
  (table) => ({
    uqKindAlias: uniqueIndex("uq_kind_alias").on(table.kind, table.alias),
  })
);

export const insertAliasSchema = createInsertSchema(aliases).omit({
  id: true,
});
export type InsertAlias = z.infer<typeof insertAliasSchema>;
export type Alias = typeof aliases.$inferSelect;

// -----------------------
// Taxonomy Relationships
// -----------------------

// Supergenre ↔ Domain relationships (many-to-many)
export const supergenreDomains = pgTable(
  "supergenre_domains",
  {
    supergenreId: uuid("supergenre_id").notNull().references(() => supergenres.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("pk_supergenre_domains").on(table.supergenreId, table.domainId),
  })
);

// Genre ↔ Domain relationships (many-to-many)
export const genreDomains = pgTable(
  "genre_domains",
  {
    genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("pk_genre_domains").on(table.genreId, table.domainId),
  })
);

// Genre ↔ Supergenre relationships (many-to-many)
export const genreSupergenres = pgTable(
  "genre_supergenres",
  {
    genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
    supergenreId: uuid("supergenre_id").notNull().references(() => supergenres.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("pk_genre_supergenres").on(table.genreId, table.supergenreId),
  })
);

// Subgenre cross-attachments to additional genres (many-to-many)
export const subgenreGenres = pgTable(
  "subgenre_genres",
  {
    subgenreId: uuid("subgenre_id").notNull().references(() => subgenres.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("pk_subgenre_genres").on(table.subgenreId, table.genreId),
  })
);


// -----------------------
// Book ↔ Taxonomy Classification Tables
// -----------------------

// Book domain assignment (single domain per book)
export const bookDomains = pgTable(
  "book_domains",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    domainId: uuid("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uqBook: uniqueIndex("uq_book_domain").on(table.bookId), // One domain per book
    idxBookDomainsBook: index("idx_book_domains_book").on(table.bookId),
  })
);

export const insertBookDomainSchema = createInsertSchema(bookDomains).omit({
  id: true,
});
export type InsertBookDomain = z.infer<typeof insertBookDomainSchema>;
export type BookDomain = typeof bookDomains.$inferSelect;

// Book supergenre assignments (multiple allowed)
export const bookSupergenres = pgTable(
  "book_supergenres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    supergenreId: uuid("supergenre_id").notNull().references(() => supergenres.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uqBookSupergenre: uniqueIndex("uq_book_supergenre").on(table.bookId, table.supergenreId),
    idxBookSupergenresBook: index("idx_book_supergenres_book").on(table.bookId),
  })
);

export const insertBookSupergenreSchema = createInsertSchema(bookSupergenres).omit({
  id: true,
});
export type InsertBookSupergenre = z.infer<typeof insertBookSupergenreSchema>;
export type BookSupergenre = typeof bookSupergenres.$inferSelect;

// Book genre assignments (multiple allowed)
export const bookGenres = pgTable(
  "book_genres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uqBookGenre: uniqueIndex("uq_book_genre").on(table.bookId, table.genreId),
    idxBookGenresBook: index("idx_book_genres_book").on(table.bookId),
  })
);

export const insertBookGenreSchema = createInsertSchema(bookGenres).omit({
  id: true,
});
export type InsertBookGenre = z.infer<typeof insertBookGenreSchema>;
export type BookGenre = typeof bookGenres.$inferSelect;

// Book subgenre assignments with confidence (multiple allowed)
export const bookSubgenres = pgTable(
  "book_subgenres",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    subgenreId: uuid("subgenre_id").notNull().references(() => subgenres.id, { onDelete: "cascade" }),
    confidence: real("confidence"), // AI confidence score (optional)
  },
  (table) => ({
    uqBookSubgenre: uniqueIndex("uq_book_subgenre").on(table.bookId, table.subgenreId),
    idxBookSubgenresBook: index("idx_book_subgenres_book").on(table.bookId),
  })
);

export const insertBookSubgenreSchema = createInsertSchema(bookSubgenres).omit({
  id: true,
});
export type InsertBookSubgenre = z.infer<typeof insertBookSubgenreSchema>;
export type BookSubgenre = typeof bookSubgenres.$inferSelect;

// Book format assignments (multiple allowed)
export const bookFormats = pgTable(
  "book_formats",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    formatId: uuid("format_id").notNull().references(() => formats.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uqBookFormat: uniqueIndex("uq_book_format").on(table.bookId, table.formatId),
    idxBookFormatsBook: index("idx_book_formats_book").on(table.bookId),
  })
);

export const insertBookFormatSchema = createInsertSchema(bookFormats).omit({
  id: true,
});
export type InsertBookFormat = z.infer<typeof insertBookFormatSchema>;
export type BookFormat = typeof bookFormats.$inferSelect;

// Book age market assignment (single age market per book)
export const bookAgeMarkets = pgTable(
  "book_age_markets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    ageMarketId: uuid("age_market_id").notNull().references(() => ageMarkets.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uqBook: uniqueIndex("uq_book_age_market").on(table.bookId), // One age market per book
    idxBookAgeMarketsBook: index("idx_book_age_markets_book").on(table.bookId),
  })
);

export const insertBookAgeMarketSchema = createInsertSchema(bookAgeMarkets).omit({
  id: true,
});
export type InsertBookAgeMarket = z.infer<typeof insertBookAgeMarketSchema>;
export type BookAgeMarket = typeof bookAgeMarkets.$inferSelect;

// Book cross-tag assignments with confidence (multiple allowed)
export const bookCrossTags = pgTable(
  "book_cross_tags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookId: uuid("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    crossTagId: uuid("cross_tag_id").notNull().references(() => crossTags.id, { onDelete: "cascade" }),
    confidence: real("confidence"), // AI confidence score (optional)
  },
  (table) => ({
    uqBookCrossTag: uniqueIndex("uq_book_cross_tag").on(table.bookId, table.crossTagId),
    idxBookCrossTagsBook: index("idx_book_cross_tags_book").on(table.bookId),
  })
);

export const insertBookCrossTagSchema = createInsertSchema(bookCrossTags).omit({
  id: true,
});
export type InsertBookCrossTag = z.infer<typeof insertBookCrossTagSchema>;
export type BookCrossTag = typeof bookCrossTags.$inferSelect;
