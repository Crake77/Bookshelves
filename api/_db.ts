// api/_db.ts
import { neon } from '@neondatabase/serverless';

/**
 * Get a Neon SQL client on demand (runtime), so we don't crash at import time
 * if env vars are not yet wired during cold starts.
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL env var');
  }
  return neon(url);
}

// Create tables if they don't exist
export async function ensureSchema() {
  const sql = getSql();
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

// Seed the five default shelves if user has none (idempotent)
export async function ensureDefaultShelves(userId: string) {
  const sql = getSql();
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
