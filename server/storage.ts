import { db } from "../db/index";
import { eq, sql, desc, and } from "drizzle-orm";
import { 
  users, books, userBooks, bookEmbeddings, customShelves, browseCategoryPreferences,
  type User, type InsertUser,
  type Book, type InsertBook,
  type UserBook, type InsertUserBook,
  type InsertBookEmbedding,
  type CustomShelf, type InsertCustomShelf,
  type BrowseCategoryPreference, type InsertBrowseCategoryPreference
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Book methods
  getBook(id: string): Promise<Book | undefined>;
  getBookByGoogleId(googleBooksId: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  searchBooks(query: string): Promise<Book[]>;

  // User books methods
  getUserBooks(userId: string, status?: string): Promise<(UserBook & { book: Book })[]>;
  addUserBook(userBook: InsertUserBook): Promise<UserBook>;
  updateUserBookStatus(id: string, status: string): Promise<UserBook | undefined>;
  removeUserBook(id: string): Promise<void>;

  // Embeddings methods
  createBookEmbedding(embedding: InsertBookEmbedding): Promise<void>;
  getBookEmbedding(bookId: string): Promise<{ bookId: string; embedding: number[] } | undefined>;
  getSimilarBooks(embedding: number[], limit: number, excludeBookIds?: string[]): Promise<Book[]>;

  // Custom shelves methods
  getCustomShelves(userId: string): Promise<CustomShelf[]>;
  createCustomShelf(shelf: InsertCustomShelf): Promise<CustomShelf>;
  updateCustomShelf(id: string, updates: Partial<InsertCustomShelf>): Promise<CustomShelf | undefined>;
  deleteCustomShelf(id: string): Promise<void>;

  // Browse category preferences methods
  getBrowseCategories(userId: string): Promise<BrowseCategoryPreference[]>;
  createBrowseCategory(category: InsertBrowseCategoryPreference): Promise<BrowseCategoryPreference>;
  updateBrowseCategory(id: string, updates: Partial<InsertBrowseCategoryPreference>): Promise<BrowseCategoryPreference | undefined>;
  deleteBrowseCategory(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getBook(id: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async getBookByGoogleId(googleBooksId: string): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.googleBooksId, googleBooksId));
    return book;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await db.insert(books).values(insertBook).returning();
    return book;
  }

  async searchBooks(query: string): Promise<Book[]> {
    return db
      .select()
      .from(books)
      .where(sql`${books.title} ILIKE ${`%${query}%`} OR array_to_string(${books.authors}, ', ') ILIKE ${`%${query}%`}`)
      .limit(20);
  }

  async getUserBooks(userId: string, status?: string): Promise<(UserBook & { book: Book })[]> {
    const conditions = [eq(userBooks.userId, userId)];
    if (status) {
      conditions.push(eq(userBooks.status, status as any));
    }

    return db
      .select({
        id: userBooks.id,
        userId: userBooks.userId,
        bookId: userBooks.bookId,
        status: userBooks.status,
        addedAt: userBooks.addedAt,
        book: books,
      })
      .from(userBooks)
      .innerJoin(books, eq(userBooks.bookId, books.id))
      .where(and(...conditions))
      .orderBy(desc(userBooks.addedAt));
  }

  async addUserBook(insertUserBook: InsertUserBook): Promise<UserBook> {
    const [userBook] = await db.insert(userBooks).values(insertUserBook).returning();
    return userBook;
  }

  async updateUserBookStatus(id: string, status: string): Promise<UserBook | undefined> {
    const [userBook] = await db
      .update(userBooks)
      .set({ status: status as any })
      .where(eq(userBooks.id, id))
      .returning();
    return userBook;
  }

  async removeUserBook(id: string): Promise<void> {
    await db.delete(userBooks).where(eq(userBooks.id, id));
  }

  async createBookEmbedding(insertEmbedding: InsertBookEmbedding): Promise<void> {
    await db.insert(bookEmbeddings).values(insertEmbedding);
  }

  async getBookEmbedding(bookId: string): Promise<{ bookId: string; embedding: number[] } | undefined> {
    const [result] = await db
      .select({
        bookId: bookEmbeddings.bookId,
        embedding: bookEmbeddings.embedding,
      })
      .from(bookEmbeddings)
      .where(eq(bookEmbeddings.bookId, bookId));
    
    return result as { bookId: string; embedding: number[] } | undefined;
  }

  async getSimilarBooks(embedding: number[], limit: number = 10, excludeBookIds?: string[]): Promise<Book[]> {
    const embeddingStr = `[${embedding.join(",")}]`;
    
    let query = sql`
      SELECT b.* 
      FROM ${books} b
      INNER JOIN ${bookEmbeddings} be ON b.id = be.book_id
      WHERE 1=1
    `;

    if (excludeBookIds && excludeBookIds.length > 0) {
      query = sql`${query} AND b.id NOT IN (${sql.join(excludeBookIds.map(id => sql`${id}`), sql`, `)})`;
    }

    query = sql`
      ${query}
      ORDER BY be.embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;

    return db.execute(query).then((result: any) => result.rows as Book[]);
  }

  // Custom shelves methods
  async getCustomShelves(userId: string): Promise<CustomShelf[]> {
    return db
      .select()
      .from(customShelves)
      .where(eq(customShelves.userId, userId))
      .orderBy(customShelves.order);
  }

  async createCustomShelf(shelf: InsertCustomShelf): Promise<CustomShelf> {
    const [result] = await db.insert(customShelves).values(shelf).returning();
    return result;
  }

  async updateCustomShelf(id: string, updates: Partial<InsertCustomShelf>): Promise<CustomShelf | undefined> {
    const [result] = await db
      .update(customShelves)
      .set(updates)
      .where(eq(customShelves.id, id))
      .returning();
    return result;
  }

  async deleteCustomShelf(id: string): Promise<void> {
    await db.delete(customShelves).where(eq(customShelves.id, id));
  }

  // Browse category preferences methods
  async getBrowseCategories(userId: string): Promise<BrowseCategoryPreference[]> {
    return db
      .select()
      .from(browseCategoryPreferences)
      .where(eq(browseCategoryPreferences.userId, userId))
      .orderBy(browseCategoryPreferences.order);
  }

  async createBrowseCategory(category: InsertBrowseCategoryPreference): Promise<BrowseCategoryPreference> {
    const [result] = await db.insert(browseCategoryPreferences).values(category).returning();
    return result;
  }

  async updateBrowseCategory(id: string, updates: Partial<InsertBrowseCategoryPreference>): Promise<BrowseCategoryPreference | undefined> {
    const [result] = await db
      .update(browseCategoryPreferences)
      .set(updates)
      .where(eq(browseCategoryPreferences.id, id))
      .returning();
    return result;
  }

  async deleteBrowseCategory(id: string): Promise<void> {
    await db.delete(browseCategoryPreferences).where(eq(browseCategoryPreferences.id, id));
  }
}

export const storage = new DbStorage();
