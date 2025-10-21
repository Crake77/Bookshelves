-- BookShelf.ai Database Schema
-- PostgreSQL with pgvector extension for AI-powered recommendations

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_books_id TEXT UNIQUE,
    title TEXT NOT NULL,
    authors TEXT[] NOT NULL,
    description TEXT,
    cover_url TEXT,
    published_date TEXT,
    page_count INTEGER,
    categories TEXT[],
    isbn TEXT
);

-- Book embeddings for vector similarity search (OpenAI embeddings)
CREATE TABLE book_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    embedding vector(1536) -- OpenAI text-embedding-3-small dimensions
);

-- Create HNSW index for fast vector similarity search
CREATE INDEX embedding_index ON book_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- User books (shelf management)
CREATE TABLE user_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('reading', 'completed', 'on-hold', 'dropped', 'plan-to-read')),
    added_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_user_books_user_id ON user_books(user_id);
CREATE INDEX idx_user_books_status ON user_books(status);
CREATE INDEX idx_book_embeddings_book_id ON book_embeddings(book_id);

-- Sample demo user (optional)
INSERT INTO users (id, username) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'demo_user') 
ON CONFLICT (username) DO NOTHING;
