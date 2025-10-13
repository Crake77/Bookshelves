// api/_db.ts
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL env var');
}

// Neon SQL client for serverless environments (Vercel)
export const sql = neon(process.env.DATABASE_URL);

// Create tables if they don't exist
export async function ensureSchema() {
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
