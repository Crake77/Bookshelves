// server/lib/api-db.ts
import { neon } from '@neondatabase/serverless';

export type SqlClient = ReturnType<typeof neon>;

/**
 * Lazily create a Neon SQL client when needed. This avoids crashes during cold
 * starts if environment variables have not been injected yet.
 */
export function getSql(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL env var');
  }
  return neon(url);
}

let ensureSchemaPromise: Promise<void> | null = null;

async function runSchemaMigrations(sql: SqlClient) {
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS shelves (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      position INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_shelves_user ON shelves(user_id);`;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS user_books (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      author TEXT,
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql/* sql */`CREATE INDEX IF NOT EXISTS idx_user_books_user ON user_books(user_id);`;
}

// Create tables if they don't exist (run only once per process)
export function ensureSchema(sql: SqlClient) {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = runSchemaMigrations(sql).catch((err) => {
      ensureSchemaPromise = null;
      throw err;
    });
  }
  return ensureSchemaPromise;
}

// Seed the five default shelves if user has none (idempotent)
export async function ensureDefaultShelves(sql: SqlClient, userId: string) {
  const defaults = [
    'Did Not Finish',
    'Waiting to Read',
    'Interested',
    'Completed',
    'In Progress',
  ];
  for (let i = 0; i < defaults.length; i++) {
    const name = defaults[i];
    await sql/* sql */`
      INSERT INTO shelves (user_id, name, position)
      SELECT ${userId}, ${name}, ${i}
      WHERE NOT EXISTS (
        SELECT 1 FROM shelves WHERE user_id = ${userId} AND name = ${name}
      );
    `;
  }
}
