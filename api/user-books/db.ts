import { neon } from "@neondatabase/serverless";
import { DEMO_USER_ID, DEMO_USER_BOOKS, type SeedUserBook } from "./seed-data.js";

type SqlClient = ReturnType<typeof neon>;

interface DbUserBookRow {
  id: string;
  user_id: string;
  book_id: string;
  status: string | null;
  rating: number | null;
  added_at: string | Date;
  google_books_id: string | null;
  title: string;
  authors: string[] | null;
  description: string | null;
  cover_url: string | null;
  published_date: string | null;
  page_count: number | null;
  categories: string[] | null;
  isbn: string | null;
}

export interface UserBookPayload {
  id: string;
  userId: string;
  bookId: string;
  status: string | null;
  rating: number | null;
  addedAt: string;
  book: {
    id: string;
    googleBooksId: string;
    title: string;
    authors: string[];
    description?: string;
    coverUrl?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    isbn?: string;
  };
}

let cachedSql: SqlClient | null = null;
let schemaEnsured = false;

function getSql(): SqlClient {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL env var");
  }
  cachedSql = neon(url);
  return cachedSql;
}

async function ensureSchema(sql: SqlClient) {
  if (schemaEnsured) return;
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await sql`CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    google_books_id text UNIQUE,
    title text NOT NULL,
    authors text[] NOT NULL DEFAULT ARRAY[]::text[],
    description text,
    cover_url text,
    published_date text,
    page_count integer,
    categories text[],
    isbn text
  )`;
  await sql`CREATE TABLE IF NOT EXISTS user_books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status text,
    rating integer,
    added_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE user_books ALTER COLUMN status DROP NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status)`;
  schemaEnsured = true;
}

function mapRow(row: DbUserBookRow): UserBookPayload {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    status: row.status,
    rating: row.rating,
    addedAt: new Date(row.added_at).toISOString(),
    book: {
      id: row.book_id,
      googleBooksId: row.google_books_id ?? row.book_id,
      title: row.title,
      authors: row.authors ?? ["Unknown Author"],
      description: row.description ?? undefined,
      coverUrl: row.cover_url ?? undefined,
      publishedDate: row.published_date ?? undefined,
      pageCount: row.page_count ?? undefined,
      categories: row.categories ?? undefined,
      isbn: row.isbn ?? undefined,
    },
  };
}

async function ensureUserExists(sql: SqlClient, userId: string) {
  await sql`INSERT INTO users (id, username) VALUES (${userId}, 'demo_user') ON CONFLICT (id) DO NOTHING`;
}

async function ensureBook(sql: SqlClient, book: SeedUserBook["book"]): Promise<string> {
  const inserted = (await sql`INSERT INTO books (google_books_id, title, authors, description, cover_url, published_date, page_count, categories, isbn) VALUES (${book.googleBooksId}, ${book.title}, ${book.authors}, ${book.description ?? null}, ${book.coverUrl ?? null}, ${book.publishedDate ?? null}, ${book.pageCount ?? null}, ${book.categories ?? null}, ${book.isbn ?? null}) ON CONFLICT (google_books_id) DO UPDATE SET title = EXCLUDED.title RETURNING id`) as Array<{ id: string }>;

  if (inserted.length > 0) {
    return inserted[0].id;
  }

  const existing = (await sql`SELECT id FROM books WHERE google_books_id = ${book.googleBooksId} LIMIT 1`) as Array<{ id: string }>;
  if (existing.length === 0) {
    throw new Error("Failed to upsert demo book");
  }
  return existing[0].id;
}

async function ensureUserBook(sql: SqlClient, userId: string, bookId: string, status: string, rating: number | null) {
  const existing = (await sql`SELECT id FROM user_books WHERE user_id = ${userId} AND book_id = ${bookId} LIMIT 1`) as Array<{ id: string }>;
  if (existing.length > 0) {
    return;
  }

  await sql`INSERT INTO user_books (user_id, book_id, status, rating) VALUES (${userId}, ${bookId}, ${status}, ${rating})`;
}

export async function ensureDemoUserSeed(userId: string) {
  if (userId !== DEMO_USER_ID) return;
  const sql = getSql();
  await ensureSchema(sql);

  await ensureUserExists(sql, userId);
  const countRows = (await sql`SELECT COUNT(*)::int AS count FROM user_books WHERE user_id = ${userId}`) as Array<{ count: number }>;
  const count = countRows[0]?.count ?? 0;
  if (Number(count) > 0) {
    return;
  }

  for (const entry of DEMO_USER_BOOKS) {
    const bookId = await ensureBook(sql, entry.book);
    await ensureUserBook(sql, userId, bookId, entry.status, entry.rating);
  }
}

export interface BookInput {
  googleBooksId: string;
  title: string;
  authors?: string[];
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  pageCount?: number | null;
  categories?: string[];
  isbn?: string;
}

export interface IngestedBookPayload extends BookInput {
  id: string;
  authors: string[];
  categories?: string[];
  pageCount?: number;
}

export async function listUserBooks(userId: string, status?: string): Promise<UserBookPayload[]> {
  const sql = getSql();
  await ensureSchema(sql);
  const rows = (status
    ? await sql`
        SELECT
          ub.id,
          ub.user_id,
          ub.book_id,
          ub.status,
          ub.rating,
          ub.added_at,
          b.google_books_id,
          b.title,
          b.authors,
          b.description,
          b.cover_url,
          b.published_date,
          b.page_count,
          b.categories,
          b.isbn
        FROM user_books ub
        INNER JOIN books b ON b.id = ub.book_id
        WHERE ub.user_id = ${userId} AND ub.status = ${status}
        ORDER BY ub.added_at DESC
      `
    : await sql`
        SELECT
          ub.id,
          ub.user_id,
          ub.book_id,
          ub.status,
          ub.rating,
          ub.added_at,
          b.google_books_id,
          b.title,
          b.authors,
          b.description,
          b.cover_url,
          b.published_date,
          b.page_count,
          b.categories,
          b.isbn
        FROM user_books ub
        INNER JOIN books b ON b.id = ub.book_id
        WHERE ub.user_id = ${userId}
        ORDER BY ub.added_at DESC
      `) as DbUserBookRow[];

  return rows.map(mapRow);
}

async function getUserBookById(userBookId: string): Promise<UserBookPayload | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      ub.id,
      ub.user_id,
      ub.book_id,
      ub.status,
      ub.rating,
      ub.added_at,
      b.google_books_id,
      b.title,
      b.authors,
      b.description,
      b.cover_url,
      b.published_date,
      b.page_count,
      b.categories,
      b.isbn
    FROM user_books ub
    INNER JOIN books b ON b.id = ub.book_id
    WHERE ub.id = ${userBookId}
    LIMIT 1
  `) as DbUserBookRow[];

  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function upsertBook(book: BookInput): Promise<IngestedBookPayload> {
  const sql = getSql();
  await ensureSchema(sql);

  const authors =
    Array.isArray(book.authors) && book.authors.length > 0
      ? book.authors
      : ["Unknown Author"];

  const categories =
    Array.isArray(book.categories) && book.categories.length > 0
      ? book.categories
      : null;

  const insertResult = (await sql`
    INSERT INTO books (
      google_books_id,
      title,
      authors,
      description,
      cover_url,
      published_date,
      page_count,
      categories,
      isbn
    )
    VALUES (
      ${book.googleBooksId},
      ${book.title},
      ${authors},
      ${book.description ?? null},
      ${book.coverUrl ?? null},
      ${book.publishedDate ?? null},
      ${book.pageCount ?? null},
      ${categories},
      ${book.isbn ?? null}
    )
    ON CONFLICT (google_books_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      authors = EXCLUDED.authors,
      description = EXCLUDED.description,
      cover_url = EXCLUDED.cover_url,
      published_date = EXCLUDED.published_date,
      page_count = EXCLUDED.page_count,
      categories = EXCLUDED.categories,
      isbn = EXCLUDED.isbn
    RETURNING id
  `) as Array<{ id: string }>;

  const id = insertResult[0]?.id;
  if (!id) {
    throw new Error("Failed to upsert book");
  }

  const rows = (await sql`
    SELECT
      id,
      google_books_id,
      title,
      authors,
      description,
      cover_url,
      published_date,
      page_count,
      categories,
      isbn
    FROM books
    WHERE id = ${id}
    LIMIT 1
  `) as Array<{
    id: string;
    google_books_id: string | null;
    title: string;
    authors: string[] | null;
    description: string | null;
    cover_url: string | null;
    published_date: string | null;
    page_count: number | null;
    categories: string[] | null;
    isbn: string | null;
  }>;

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to load book after upsert");
  }

  return {
    id: row.id,
    googleBooksId: row.google_books_id ?? book.googleBooksId,
    title: row.title,
    authors: row.authors ?? authors,
    description: row.description ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    publishedDate: row.published_date ?? undefined,
    pageCount: row.page_count ?? undefined,
    categories: row.categories ?? undefined,
    isbn: row.isbn ?? undefined,
  };
}

export async function addUserBook(userId: string, bookId: string, status: string | null): Promise<UserBookPayload> {
  const sql = getSql();
  await ensureSchema(sql);
  await ensureUserExists(sql, userId);

  const existing = (await sql`SELECT id FROM user_books WHERE user_id = ${userId} AND book_id = ${bookId} LIMIT 1`) as Array<{ id: string }>;
  if (existing.length > 0) {
    const existingId = existing[0].id;
    await sql`UPDATE user_books SET status = ${status} WHERE id = ${existingId}`;
    const current = await getUserBookById(existingId);
    if (!current) {
      throw new Error("Failed to load existing user book");
    }
    return current;
  }

  const inserted = (await sql`INSERT INTO user_books (user_id, book_id, status) VALUES (${userId}, ${bookId}, ${status}) RETURNING id`) as Array<{ id: string }>;
  const id = inserted[0]?.id;
  if (!id) {
    throw new Error("Failed to create user book");
  }
  const userBook = await getUserBookById(id);
  if (!userBook) {
    throw new Error("Failed to load created user book");
  }
  return userBook;
}

export async function updateUserBookStatus(userBookId: string, status: string | null): Promise<UserBookPayload | null> {
  const sql = getSql();
  await ensureSchema(sql);
  const updated = (await sql`UPDATE user_books SET status = ${status} WHERE id = ${userBookId} RETURNING id`) as Array<{ id: string }>;
  if (updated.length === 0) return null;
  return await getUserBookById(userBookId);
}

export async function removeUserBook(userBookId: string): Promise<boolean> {
  const sql = getSql();
  await ensureSchema(sql);
  const deleted = (await sql`DELETE FROM user_books WHERE id = ${userBookId} RETURNING id`) as Array<{ id: string }>;
  return deleted.length > 0;
}

export async function updateUserBookRating(userBookId: string, rating: number): Promise<UserBookPayload | null> {
  const sql = getSql();
  await ensureSchema(sql);
  const updated = (await sql`UPDATE user_books SET rating = ${rating} WHERE id = ${userBookId} RETURNING id`) as Array<{ id: string }>;
  if (updated.length === 0) return null;
  return await getUserBookById(userBookId);
}
