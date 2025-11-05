import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

type SqlClient = ReturnType<typeof neon>;

// Browse request params used internally. In addition to a coarse `genre`
// filter (string match on `books.categories`), we support taxonomy-aware
// filters by subgenre and cross tag slugs. When provided, these are applied
// via EXISTS subqueries on link tables and are designed to be no-ops when
// null (using the form `$1::text IS NULL OR EXISTS(...)`).
interface BrowseParams {
  algo: BrowseAlgo;
  userId?: string;
  genre?: string | null;
  genreSlug?: string | null; // taxonomy: genre slug
  subgenreSlug?: string | null; // taxonomy: subgenre slug
  tagSlug?: string | null;      // taxonomy: cross tag slug
  tagAny?: string[] | null;     // preference boost: any of these tag slugs
  blockedTags?: string[] | null; // taxonomy: exclude books with these tag slugs
  authorName?: string | null;    // author exact match
  formatSlug?: string | null;    // taxonomy: format slug
  audienceSlug?: string | null;  // taxonomy: age market slug
  domainSlug?: string | null;    // taxonomy: domain slug
  supergenreSlug?: string | null; // taxonomy: supergenre slug
  series?: string | null; // series slug (e.g., "wheel-of-time")
  seriesPosition?: boolean; // if true, only show books with seriesOrder (main sequence)
  limit: number;
  offset: number;
}

interface RawBookRow {
  id: string;
  google_books_id: string | null;
  title: string | null;
  authors: string[] | null;
  description: string | null;
  cover_url: string | null;
  published_date: string | null;
  page_count: number | null;
  categories: string[] | null;
  isbn: string | null;
}

type BrowseAlgo = "popular" | "rating" | "recent" | "for-you";

interface BookPayload {
  id?: string; // DB book id when available
  googleBooksId: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  isbn?: string;
}

let cachedSql: SqlClient | null = null;
let schemaEnsured = false;
let catalogSeedPromise: Promise<void> | null = null;

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

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS books (
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
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_books (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      status text,
      rating integer,
      added_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE user_books ALTER COLUMN status DROP NOT NULL`;

  await sql`CREATE INDEX IF NOT EXISTS idx_user_books_book ON user_books(book_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_books_user ON user_books(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_books_rating ON user_books(rating)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_books_added ON user_books(added_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_books_categories ON books USING GIN (categories)`;

  await sql`
    CREATE TABLE IF NOT EXISTS book_stats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      book_id uuid NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
      average_rating integer,
      total_ratings integer NOT NULL DEFAULT 0,
      ranking integer,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  schemaEnsured = true;
}

const MIN_CATALOG_BOOKS = 400;
const RECENT_YEARS = 5;
const RECENT_RELEASE_YEARS = 3;

const CATALOG_SEED_QUERIES: Array<{ query: string; genre?: string | null; orderBy?: "relevance" | "newest" }> = [
  { query: "best selling books", orderBy: "relevance" },
  { query: "award winning novels", orderBy: "relevance" },
  { query: "subject:Fantasy", genre: "Fantasy", orderBy: "relevance" },
  { query: "subject:Science Fiction", genre: "Science Fiction", orderBy: "relevance" },
  { query: "subject:Mystery", genre: "Mystery", orderBy: "relevance" },
  { query: "subject:Romance", genre: "Romance", orderBy: "relevance" },
  { query: "subject:Fantasy", genre: "Fantasy", orderBy: "newest" },
  { query: "subject:Science Fiction", genre: "Science Fiction", orderBy: "newest" },
  { query: "subject:Mystery", genre: "Mystery", orderBy: "newest" },
  { query: "subject:Romance", genre: "Romance", orderBy: "newest" },
  { query: "2024 bestsellers", orderBy: "relevance" },
  { query: "2023 bestsellers", orderBy: "relevance" },
  { query: "new fantasy releases 2024", genre: "Fantasy", orderBy: "newest" },
  { query: "new science fiction releases 2024", genre: "Science Fiction", orderBy: "newest" },
  { query: "new mystery thrillers 2024", genre: "Mystery", orderBy: "newest" },
  { query: "2025 adult fiction bestsellers", orderBy: "relevance" },
  { query: "2025 fantasy bestseller", genre: "Fantasy", orderBy: "newest" },
  { query: "2025 science fiction novel", genre: "Science Fiction", orderBy: "newest" },
  { query: "2024 romance bestseller", genre: "Romance", orderBy: "newest" },
  { query: "hugo award 2024", genre: "Science Fiction", orderBy: "relevance" },
  { query: "nebula award novel", genre: "Science Fiction", orderBy: "relevance" },
  { query: "goodreads choice awards 2024 fantasy", genre: "Fantasy", orderBy: "relevance" },
  { query: "goodreads choice awards 2024 science fiction", genre: "Science Fiction", orderBy: "relevance" },
];

interface SeedVolume {
  googleBooksId: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  publishedDate?: string;
  pageCount?: number | null;
  categories?: string[];
  isbn?: string;
  averageRating?: number | null;
  ratingsCount?: number | null;
}

function normalizeStringArray(values: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(values)) {
    return [...fallback];
  }
  return values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
}

function normalizeCoverUrl(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  if (raw.startsWith("http://")) {
    return raw.replace("http://", "https://");
  }
  return raw;
}

async function fetchCatalogVolumes(
  query: string,
  orderBy: "relevance" | "newest" = "relevance",
  startIndex: number = 0,
): Promise<SeedVolume[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", orderBy);
  url.searchParams.set("startIndex", String(Math.max(0, startIndex)));

  const response = await fetch(url.toString());
  if (!response.ok) {
    console.warn(`[browse seed] Google Books request failed (${response.status}) for query "${query}"`);
    return [];
  }

  const payload = (await response.json()) as {
    items?: Array<{ id?: string; volumeInfo?: Record<string, any> }>;
  };

  return (payload.items ?? []).map((item) => {
    const volume = item.volumeInfo ?? {};
    const authors = normalizeStringArray(volume.authors, ["Unknown Author"]);
    const categories = normalizeStringArray(volume.categories);
    const imageLinks = volume.imageLinks ?? {};

    const isbnEntry = Array.isArray(volume.industryIdentifiers)
      ? volume.industryIdentifiers.find((identifier: any) => typeof identifier?.identifier === "string")
      : null;

    return {
      googleBooksId: item.id ?? volume.title ?? randomUUID(),
      title: typeof volume.title === "string" ? volume.title : "Untitled",
      authors: authors.length > 0 ? authors : ["Unknown Author"],
      description: typeof volume.description === "string" ? volume.description : undefined,
      coverUrl: normalizeCoverUrl(imageLinks.thumbnail ?? imageLinks.smallThumbnail ?? null),
      publishedDate: typeof volume.publishedDate === "string" ? volume.publishedDate : undefined,
      pageCount: typeof volume.pageCount === "number" ? volume.pageCount : null,
      categories,
      isbn: typeof isbnEntry?.identifier === "string" ? isbnEntry.identifier : undefined,
      averageRating:
        typeof volume.averageRating === "number" && Number.isFinite(volume.averageRating)
          ? volume.averageRating
          : undefined,
      ratingsCount:
        typeof volume.ratingsCount === "number" && Number.isFinite(volume.ratingsCount)
          ? volume.ratingsCount
      : undefined,
    } satisfies SeedVolume;
  });
}

function seedVolumeToBookPayload(volume: SeedVolume): BookPayload | null {
  const googleBooksId = volume.googleBooksId ?? null;
  if (!googleBooksId) {
    return null;
  }

  const authors =
    Array.isArray(volume.authors) && volume.authors.length > 0
      ? volume.authors
      : ["Unknown Author"];
  const categories =
    Array.isArray(volume.categories) && volume.categories.length > 0
      ? volume.categories
      : undefined;

  return {
    googleBooksId,
    title: volume.title ?? "Untitled",
    authors,
    description: volume.description ?? undefined,
    coverUrl: normalizeCoverUrl(volume.coverUrl) ?? undefined,
    publishedDate: volume.publishedDate ?? undefined,
    pageCount:
      typeof volume.pageCount === "number" ? volume.pageCount : undefined,
    categories,
    isbn: volume.isbn ?? undefined,
  };
}

async function upsertCatalogBook(sql: SqlClient, volume: SeedVolume, enforcedGenre?: string | null) {
  const authors = volume.authors.length > 0 ? volume.authors : ["Unknown Author"];
  const categoriesSet = new Set(
    [
      ...(Array.isArray(volume.categories) ? volume.categories : []),
      ...(enforcedGenre ? [enforcedGenre] : []),
    ]
      .map((category) => (typeof category === "string" ? category.trim() : ""))
      .filter((category) => category.length > 0)
  );

  const categories = categoriesSet.size > 0 ? Array.from(categoriesSet) : null;
  const pageCount = typeof volume.pageCount === "number" && Number.isFinite(volume.pageCount) ? volume.pageCount : null;
  const averageRating =
    typeof volume.averageRating === "number" && Number.isFinite(volume.averageRating)
      ? Math.round(volume.averageRating * 20)
      : null;
  const totalRatings =
    typeof volume.ratingsCount === "number" && Number.isFinite(volume.ratingsCount)
      ? Math.max(0, Math.round(volume.ratingsCount))
      : 0;

  const [bookRow] = (await sql`
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
      ${volume.googleBooksId},
      ${volume.title},
      ${authors},
      ${volume.description ?? null},
      ${volume.coverUrl ?? null},
      ${volume.publishedDate ?? null},
      ${pageCount},
      ${categories},
      ${volume.isbn ?? null}
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

  const bookId = bookRow?.id;
  if (!bookId) return;

  await sql`
    INSERT INTO book_stats (book_id, average_rating, total_ratings, ranking, updated_at)
    VALUES (${bookId}, ${averageRating}, ${totalRatings}, NULL, now())
    ON CONFLICT (book_id)
    DO UPDATE SET
      average_rating = EXCLUDED.average_rating,
      total_ratings = EXCLUDED.total_ratings,
      updated_at = now()
  `;
}

async function ensureCatalogSeed(sql: SqlClient) {
  if (catalogSeedPromise) {
    await catalogSeedPromise;
    return;
  }

  catalogSeedPromise = (async () => {
    try {
      const [{ count }] = (await sql`SELECT COUNT(*)::int AS count FROM book_stats`) as Array<{ count: number }>;
      if ((count ?? 0) >= MIN_CATALOG_BOOKS) {
        return;
      }

      for (const seed of CATALOG_SEED_QUERIES) {
        try {
          const volumes = await fetchCatalogVolumes(seed.query, seed.orderBy ?? "relevance");
          for (const volume of volumes) {
            await upsertCatalogBook(sql, volume, seed.genre ?? null);
          }
        } catch (seedError) {
          console.warn(`[browse seed] Failed query "${seed.query}":`, seedError);
        }
      }
    } catch (error) {
      console.error("[browse seed] Failed to ensure catalog seed", error);
    }
  })().finally(() => {
    catalogSeedPromise = null;
  });

  await catalogSeedPromise;
}

function normalizeGenre(genre?: string | null): string | null {
  if (!genre) return null;
  const trimmed = genre.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function clampLimit(value: number | null | undefined, max: number, fallback: number): number {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(value, max));
}

function buildGenrePattern(genre: string | null): string | null {
  return genre ? `%${genre}%` : null;
}

function toBookPayload(row: RawBookRow): BookPayload {
  const authors =
    Array.isArray(row.authors) && row.authors.length > 0 ? row.authors : ["Unknown Author"];
  const categories =
    Array.isArray(row.categories) && row.categories.length > 0 ? row.categories : undefined;
  const pageCount =
    typeof row.page_count === "number"
      ? row.page_count
      : typeof row.page_count === "string"
        ? Number.parseInt(row.page_count, 10)
        : undefined;

  return {
    id: row.id,
    googleBooksId: row.google_books_id ?? row.id,
    title: row.title ?? "Untitled",
    authors,
    description: row.description ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    publishedDate: row.published_date ?? undefined,
    pageCount: Number.isFinite(pageCount) ? pageCount : undefined,
    categories,
    isbn: row.isbn ?? undefined,
  };
}

async function fetchPopular(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  const genre = normalizeGenre(params.genre);
  const genrePattern = buildGenrePattern(genre);

  // SIMPLIFIED QUERY: Only uses books and book_stats (no taxonomy tables)
  const queryResult = genre
    ? await sql`
        SELECT
          b.id,
          b.google_books_id,
          b.title,
          b.authors,
          b.description,
          b.cover_url,
          b.published_date,
          b.page_count,
          b.categories,
          b.isbn,
          COALESCE(bs.total_ratings, 0) AS total_ratings,
          COALESCE(bs.average_rating, 0) AS average_rating
        FROM books b
        LEFT JOIN book_stats bs ON bs.book_id = b.id
        WHERE EXISTS (
          SELECT 1
          FROM unnest(COALESCE(b.categories, ARRAY[]::text[])) AS cat(category)
          WHERE LOWER(cat.category) LIKE ${genrePattern}
        )
        AND (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_subgenres bps
          JOIN subgenres sg ON sg.id = bps.subgenre_id
          WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
        ))
        AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_genres bg
          JOIN genres g ON g.id = bg.genre_id
          WHERE bg.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
        ))
        AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_cross_tags bct
          JOIN cross_tags ct ON ct.id = bct.cross_tag_id
          WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
        ))
        AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
          SELECT 1 FROM book_cross_tags bct
          JOIN cross_tags ct ON ct.id = bct.cross_tag_id
          WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
        ))
        AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_subgenres bps
          JOIN subgenres sg ON sg.id = bps.subgenre_id
          JOIN genres g ON g.id = sg.genre_id
          JOIN genre_domains gd ON gd.genre_id = g.id
          JOIN domains d ON d.id = gd.domain_id
          WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
        ))
        AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_subgenres bps
          JOIN subgenres sg ON sg.id = bps.subgenre_id
          JOIN genres g ON g.id = sg.genre_id
          JOIN genre_supergenres gs ON gs.genre_id = g.id
          JOIN supergenres sp ON sp.id = gs.supergenre_id
          WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
        ))
        AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_formats bf
          JOIN formats f ON f.id = bf.format_id
          WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
        ))
        AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_age_markets bam
          JOIN age_markets am ON am.id = bam.age_market_id
          WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
        ))
        AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
          WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
        ))
        -- Series filter: join books -> editions -> works
        AND (${params.series ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM editions e
          JOIN works w ON w.id = e.work_id
          WHERE e.legacy_book_id = b.id
            AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
            ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
        ))
        ORDER BY
          COALESCE(bs.total_ratings, 0) DESC,
          COALESCE(bs.average_rating, 0) DESC,
          b.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `
    : await sql`
        SELECT
          b.id,
          b.google_books_id,
          b.title,
          b.authors,
          b.description,
          b.cover_url,
          b.published_date,
          b.page_count,
          b.categories,
          b.isbn
        FROM books b
        LEFT JOIN book_stats bs ON bs.book_id = b.id
        WHERE 1=1
        AND (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_subgenres bps
          JOIN subgenres sg ON sg.id = bps.subgenre_id
          WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
        ))
        AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_genres bg
          JOIN genres g ON g.id = bg.genre_id
          WHERE bg.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
        ))
        AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_cross_tags bct
          JOIN cross_tags ct ON ct.id = bct.cross_tag_id
          WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
        ))
        AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
          SELECT 1 FROM book_cross_tags bct
          JOIN cross_tags ct ON ct.id = bct.cross_tag_id
          WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
        ))
        AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_subgenres bps
          JOIN subgenres sg ON sg.id = bps.subgenre_id
          JOIN genres g ON g.id = sg.genre_id
          JOIN genre_domains gd ON gd.genre_id = g.id
          JOIN domains d ON d.id = gd.domain_id
          WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
        ))
        AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_subgenres bps
          JOIN subgenres sg ON sg.id = bps.subgenre_id
          JOIN genres g ON g.id = sg.genre_id
          JOIN genre_supergenres gs ON gs.genre_id = g.id
          JOIN supergenres sp ON sp.id = gs.supergenre_id
          WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
        ))
        AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_formats bf
          JOIN formats f ON f.id = bf.format_id
          WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
        ))
        AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM book_age_markets bam
          JOIN age_markets am ON am.id = bam.age_market_id
          WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
        ))
        AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
          WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
        ))
        -- Series filter: join books -> editions -> works
        AND (${params.series ?? null}::text IS NULL OR EXISTS (
          SELECT 1 FROM editions e
          JOIN works w ON w.id = e.work_id
          WHERE e.legacy_book_id = b.id
            AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
            ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
        ))
        ORDER BY
          COALESCE(bs.total_ratings, 0) DESC,
          COALESCE(bs.average_rating, 0) DESC,
          b.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `;

  const rows = Array.isArray(queryResult) ? (queryResult as RawBookRow[]) : [];
  let books = rows.map(toBookPayload);

  // If no results for a specific genre, fallback to global popular
  if (books.length === 0 && genre && !params.subgenreSlug && !params.tagSlug && !params.genreSlug) {
    return fetchPopular(sql, { ...params, genre: null });
  }

  // TEMPORARILY DISABLED: Top up to requested limit using remote volumes if needed
  // TODO: Re-enable after validating batch 1-3 data
  // if (books.length < params.limit && !params.subgenreSlug && !params.tagSlug && !params.genreSlug) {
  //   const seen = new Set(books.map((b) => b.googleBooksId.toLowerCase()));
  //   const remoteQuery = genre && genre.length > 0 ? `subject:${genre}` : "best selling books";
  //   let remoteCursor = params.offset;
  //   let attempts = 0;

  //   while (books.length < params.limit && attempts < 5) {
  //     const remoteVolumes = await fetchCatalogVolumes(remoteQuery, "relevance", remoteCursor);
  //     remoteCursor += remoteVolumes.length;
  //     attempts++;
  //     if (remoteVolumes.length === 0) break;

  //     for (const volume of remoteVolumes) {
  //       const payload = seedVolumeToBookPayload(volume);
  //       if (!payload) continue;
  //       const key = (payload.googleBooksId || "").toLowerCase();
  //       if (seen.has(key)) continue;
  //       seen.add(key);
  //       books.push(payload);
  //       if (books.length >= params.limit) break;
  //     }
  //   }
  // }

  // TEMPORARILY DISABLED: Tag-specific top up
  // TODO: Re-enable after validating batch 1-3 data
  // if (books.length < params.limit && params.tagSlug) {
  //   const seen = new Set(books.map((b) => b.googleBooksId.toLowerCase()));
  //   let tagName = params.tagSlug.replace(/-/g, " ");
  //   try {
  //     const rows = (await sql/* sql */`SELECT name FROM cross_tags WHERE slug = ${params.tagSlug} LIMIT 1`) as Array<{ name: string }>;
  //     if (rows[0]?.name) tagName = rows[0].name;
  //   } catch {}
  //   const remoteQuery = `"${tagName}"`;
  //   let remoteCursor = params.offset;
  //   let attempts = 0;
  //   while (books.length < params.limit && attempts < 5) {
  //     const remoteVolumes = await fetchCatalogVolumes(remoteQuery, "relevance", remoteCursor);
  //     remoteCursor += remoteVolumes.length;
  //     attempts++;
  //     if (remoteVolumes.length === 0) break;

  //     for (const volume of remoteVolumes) {
  //       const payload = seedVolumeToBookPayload(volume);
  //       if (!payload) continue;
  //       const key = (payload.googleBooksId || "").toLowerCase();
  //       if (seen.has(key)) continue;
  //       seen.add(key);
  //       books.push(payload);
  //       if (books.length >= params.limit) break;
  //     }
  //   }
  // }

  // TEMPORARILY DISABLED: Genre-specific top up
  // TODO: Re-enable after validating batch 1-3 data
  // if (books.length < params.limit && params.genreSlug) {
  //   const seen = new Set(books.map((b) => b.googleBooksId.toLowerCase()));
  //   let genreName = params.genreSlug.replace(/-/g, " ");
  //   try {
  //     const rows = (await sql/* sql */`SELECT name FROM genres WHERE slug = ${params.genreSlug} LIMIT 1`) as Array<{ name: string }>;
  //     if (rows[0]?.name) genreName = rows[0].name;
  //   } catch {}
  //   const remoteQuery = `subject:${genreName}`;
  //   let remoteCursor = params.offset;
  //   let attempts = 0;
  //   while (books.length < params.limit && attempts < 5) {
  //     const remoteVolumes = await fetchCatalogVolumes(remoteQuery, "relevance", remoteCursor);
  //     remoteCursor += remoteVolumes.length;
  //     attempts++;
  //     if (remoteVolumes.length === 0) break;
  //     for (const volume of remoteVolumes) {
  //       const payload = seedVolumeToBookPayload(volume);
  //       if (!payload) continue;
  //       const key = (payload.googleBooksId || "").toLowerCase();
  //       if (seen.has(key)) continue;
  //       seen.add(key);
  //       books.push(payload);
  //       if (books.length >= params.limit) break;
  //     }
  //   }
  // }

  // TEMPORARILY DISABLED: Subgenre-specific top up
  // TODO: Re-enable after validating batch 1-3 data
  // if (books.length < params.limit && params.subgenreSlug) {
  //   const seen = new Set(books.map((b) => b.googleBooksId.toLowerCase()));
  //   let subgenreName = params.subgenreSlug.replace(/-/g, " ");
  //   try {
  //     const rows = (await sql/* sql */`SELECT name FROM subgenres WHERE slug = ${params.subgenreSlug} LIMIT 1`) as Array<{ name: string }>;
  //     if (rows[0]?.name) subgenreName = rows[0].name;
  //   } catch {}
  //   const remoteQuery = `${subgenreName}`;
  //   let remoteCursor = params.offset;
  //   let attempts = 0;
  //   while (books.length < params.limit && attempts < 5) {
  //     const remoteVolumes = await fetchCatalogVolumes(remoteQuery, "relevance", remoteCursor);
  //     remoteCursor += remoteVolumes.length;
  //     attempts++;
  //     if (remoteVolumes.length === 0) break;
  //     for (const volume of remoteVolumes) {
  //       const payload = seedVolumeToBookPayload(volume);
  //       if (!payload) continue;
  //       const key = (payload.googleBooksId || "").toLowerCase();
  //       if (seen.has(key)) continue;
  //       seen.add(key);
  //       books.push(payload);
  //       if (books.length >= params.limit) break;
  //     }
  //   }
  // }

  return books.slice(0, params.limit);
}

async function fetchHighestRated(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  const genre = normalizeGenre(params.genre);
  const priorWeight = 10;
  const genrePattern = buildGenrePattern(genre);

  const queryResult = genre
    ? await sql`
        WITH catalog AS (
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn,
            COALESCE(bs.average_rating, 0)::float AS avg_rating,
            COALESCE(bs.total_ratings, 0)::float AS rating_count,
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END AS published_at
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
          WHERE EXISTS (
            SELECT 1
            FROM unnest(COALESCE(b.categories, ARRAY[]::text[])) AS cat(category)
            WHERE LOWER(cat.category) LIKE ${genrePattern}
          )
          AND (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
          ))
          AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            WHERE bps.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
          ))
          AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
          ))
          -- Block filter: exclude books with blocked tags
          AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
          ))
          -- Domain filter
          AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_domains gd ON gd.genre_id = g.id
            JOIN domains d ON d.id = gd.domain_id
            WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
          ))
          -- Supergenre filter
          AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_supergenres gs ON gs.genre_id = g.id
            JOIN supergenres sp ON sp.id = gs.supergenre_id
            WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
          ))
          -- Format filter  
          AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_formats bf
            JOIN formats f ON f.id = bf.format_id
            WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
          ))
          -- Audience filter
          AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_age_markets bam
            JOIN age_markets am ON am.id = bam.age_market_id
            WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
          ))
          -- Author filter
          AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
            WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
          ))
          -- Series filter: join books -> editions -> works
          AND (${params.series ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM editions e
            JOIN works w ON w.id = e.work_id
            WHERE e.legacy_book_id = b.id
              AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
              ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
          ))
        ),
        global AS (
          SELECT
            COALESCE(AVG(bs.average_rating), 70)::float AS avg_rating,
            COALESCE(AVG(bs.total_ratings), 10)::float AS avg_count
          FROM book_stats bs
        )
        SELECT
          catalog.id,
          catalog.google_books_id,
          catalog.title,
          catalog.authors,
          catalog.description,
          catalog.cover_url,
          catalog.published_date,
          catalog.page_count,
          catalog.categories,
          catalog.isbn,
          catalog.published_at,
          CASE
            WHEN catalog.rating_count <= 0 THEN global.avg_rating
            ELSE (
              (catalog.rating_count / (catalog.rating_count + ${priorWeight}::float)) * catalog.avg_rating +
              (${priorWeight}::float / (catalog.rating_count + ${priorWeight}::float)) * global.avg_rating
            )
          END AS weighted_score,
          catalog.rating_count
        FROM catalog
        CROSS JOIN global
        ORDER BY
          weighted_score DESC,
          catalog.rating_count DESC,
          COALESCE(catalog.published_at, CURRENT_DATE - make_interval(years => ${RECENT_YEARS})) DESC,
          catalog.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `
    : await sql`
        WITH catalog AS (
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn,
            COALESCE(bs.average_rating, 0)::float AS avg_rating,
            COALESCE(bs.total_ratings, 0)::float AS rating_count,
            COALESCE(tm.tag_matches, 0)::int AS tag_matches,
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END AS published_at
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS tag_matches
            FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id
              AND (${params.tagAny ?? null}::text[] IS NOT NULL AND ct.slug = ANY(${params.tagAny ?? null}::text[]))
          ) tm ON TRUE
          WHERE (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
          ))
          AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            WHERE bps.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
          ))
          AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
          ))
          -- Block filter: exclude books with blocked tags
          AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
          ))
          -- Domain filter
          AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_domains gd ON gd.genre_id = g.id
            JOIN domains d ON d.id = gd.domain_id
            WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
          ))
          -- Supergenre filter
          AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_supergenres gs ON gs.genre_id = g.id
            JOIN supergenres sp ON sp.id = gs.supergenre_id
            WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
          ))
          -- Format filter  
          AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_formats bf
            JOIN formats f ON f.id = bf.format_id
            WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
          ))
          -- Audience filter
          AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_age_markets bam
            JOIN age_markets am ON am.id = bam.age_market_id
            WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
          ))
          -- Author filter
          AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
            WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
          ))
          -- Series filter: join books -> editions -> works
          AND (${params.series ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM editions e
            JOIN works w ON w.id = e.work_id
            WHERE e.legacy_book_id = b.id
              AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
              ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
          ))
        ),
        global AS (
          SELECT
            COALESCE(AVG(bs.average_rating), 70)::float AS avg_rating,
            COALESCE(AVG(bs.total_ratings), 10)::float AS avg_count
          FROM book_stats bs
        )
        SELECT
          catalog.id,
          catalog.google_books_id,
          catalog.title,
          catalog.authors,
          catalog.description,
          catalog.cover_url,
          catalog.published_date,
          catalog.page_count,
          catalog.categories,
          catalog.isbn,
          catalog.published_at,
          CASE
            WHEN catalog.rating_count <= 0 THEN global.avg_rating
            ELSE (
              (catalog.rating_count / (catalog.rating_count + ${priorWeight}::float)) * catalog.avg_rating +
              (${priorWeight}::float / (catalog.rating_count + ${priorWeight}::float)) * global.avg_rating
            )
          END AS weighted_score,
          catalog.rating_count
        FROM catalog
        CROSS JOIN global
        ORDER BY
          catalog.tag_matches DESC,
          weighted_score DESC,
          catalog.rating_count DESC,
          COALESCE(catalog.published_at, CURRENT_DATE - make_interval(years => ${RECENT_YEARS})) DESC,
          catalog.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `;

  const rows = Array.isArray(queryResult) ? (queryResult as RawBookRow[]) : [];
  if (rows.length === 0 && genre) {
    return fetchHighestRated(sql, { ...params, genre: null });
  }
  let books = rows.map(toBookPayload);

  // Augment when thin and taxonomy filters present
  if (books.length < params.limit && (params.tagSlug || params.subgenreSlug || params.genreSlug)) {
    const seen = new Set(books.map((b) => (b.googleBooksId || "").toLowerCase()));
    let remoteQuery: string | null = null;
    if (params.tagSlug) {
      try {
        const rows = (await sql/* sql */`SELECT name FROM cross_tags WHERE slug = ${params.tagSlug} LIMIT 1`) as Array<{ name: string }>;
        remoteQuery = rows[0]?.name ?? params.tagSlug.replace(/-/g, " ");
      } catch {}
    } else if (params.subgenreSlug) {
      try {
        const rows = (await sql/* sql */`SELECT name FROM subgenres WHERE slug = ${params.subgenreSlug} LIMIT 1`) as Array<{ name: string }>;
        remoteQuery = rows[0]?.name ?? params.subgenreSlug.replace(/-/g, " ");
      } catch {}
    } else if (params.genreSlug) {
      try {
        const rows = (await sql/* sql */`SELECT name FROM genres WHERE slug = ${params.genreSlug} LIMIT 1`) as Array<{ name: string }>;
        remoteQuery = rows[0]?.name ? `subject:${rows[0].name}` : `subject:${params.genreSlug.replace(/-/g, " ")}`;
      } catch {}
    }
    if (remoteQuery) {
      let cursor = params.offset;
      let attempts = 0;
      while (books.length < params.limit && attempts < 5) {
        const vols = await fetchCatalogVolumes(remoteQuery, "relevance", cursor);
        cursor += vols.length;
        attempts++;
        if (vols.length === 0) break;
        for (const v of vols) {
          const payload = seedVolumeToBookPayload(v);
          if (!payload) continue;
          const key = (payload.googleBooksId || "").toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          books.push(payload);
          if (books.length >= params.limit) break;
        }
      }
    }
  }
  return books.slice(0, params.limit);
}

async function fetchRecentlyAdded(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  const genre = normalizeGenre(params.genre);
  const genrePattern = buildGenrePattern(genre);

  const baseQuery = genre
    ? await sql`
        WITH catalog AS (
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn,
            COALESCE(bs.total_ratings, 0) AS total_ratings,
            COALESCE(bs.updated_at, now()) AS stats_updated,
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END AS published_at
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
          WHERE EXISTS (
            SELECT 1
            FROM unnest(COALESCE(b.categories, ARRAY[]::text[])) AS cat(category)
            WHERE LOWER(cat.category) LIKE ${genrePattern}
          )
          AND (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
          ))
          AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            WHERE bps.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
          ))
          AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
          ))
          -- Block filter: exclude books with blocked tags
          AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
          ))
          -- Domain filter
          AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_domains gd ON gd.genre_id = g.id
            JOIN domains d ON d.id = gd.domain_id
            WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
          ))
          -- Supergenre filter
          AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_supergenres gs ON gs.genre_id = g.id
            JOIN supergenres sp ON sp.id = gs.supergenre_id
            WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
          ))
          -- Format filter  
          AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_formats bf
            JOIN formats f ON f.id = bf.format_id
            WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
          ))
          -- Audience filter
          AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_age_markets bam
            JOIN age_markets am ON am.id = bam.age_market_id
            WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
          ))
          -- Author filter
          AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
            WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
          ))
          -- Series filter: join books -> editions -> works
          AND (${params.series ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM editions e
            JOIN works w ON w.id = e.work_id
            WHERE e.legacy_book_id = b.id
              AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
              ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
          ))
        )
        SELECT
          catalog.id,
          catalog.google_books_id,
          catalog.title,
          catalog.authors,
          catalog.description,
          catalog.cover_url,
          catalog.published_date,
          catalog.page_count,
          catalog.categories,
          catalog.isbn
        FROM catalog
        WHERE catalog.published_at IS NOT NULL
          AND catalog.published_at >= CURRENT_DATE - make_interval(years => ${RECENT_RELEASE_YEARS})
        ORDER BY
          CASE WHEN catalog.total_ratings > 0 THEN 0 ELSE 1 END,
          catalog.published_at DESC,
          catalog.stats_updated DESC,
          catalog.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `
    : await sql`
        WITH catalog AS (
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn,
            COALESCE(bs.total_ratings, 0) AS total_ratings,
            COALESCE(bs.updated_at, now()) AS stats_updated,
            COALESCE(tm.tag_matches, 0)::int AS tag_matches,
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END AS published_at
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS tag_matches
            FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id
              AND (${params.tagAny ?? null}::text[] IS NOT NULL AND ct.slug = ANY(${params.tagAny ?? null}::text[]))
          ) tm ON TRUE
          WHERE (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
          ))
          AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            WHERE bps.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
          ))
          AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
          ))
          -- Block filter: exclude books with blocked tags
          AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
          ))
          -- Domain filter
          AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_domains gd ON gd.genre_id = g.id
            JOIN domains d ON d.id = gd.domain_id
            WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
          ))
          -- Supergenre filter
          AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_supergenres gs ON gs.genre_id = g.id
            JOIN supergenres sp ON sp.id = gs.supergenre_id
            WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
          ))
          -- Format filter  
          AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_formats bf
            JOIN formats f ON f.id = bf.format_id
            WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
          ))
          -- Audience filter
          AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_age_markets bam
            JOIN age_markets am ON am.id = bam.age_market_id
            WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
          ))
          -- Author filter
          AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
            WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
          ))
          -- Series filter: join books -> editions -> works
          AND (${params.series ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM editions e
            JOIN works w ON w.id = e.work_id
            WHERE e.legacy_book_id = b.id
              AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
              ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
          ))
        )
        SELECT
          catalog.id,
          catalog.google_books_id,
          catalog.title,
          catalog.authors,
          catalog.description,
          catalog.cover_url,
          catalog.published_date,
          catalog.page_count,
          catalog.categories,
          catalog.isbn
        FROM catalog
        WHERE catalog.published_at IS NOT NULL
          AND catalog.published_at >= CURRENT_DATE - make_interval(years => ${RECENT_RELEASE_YEARS})
        ORDER BY
          catalog.tag_matches DESC,
          CASE WHEN catalog.total_ratings > 0 THEN 0 ELSE 1 END,
          catalog.published_at DESC,
          catalog.stats_updated DESC,
          catalog.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `;

  const primaryRows = Array.isArray(baseQuery) ? (baseQuery as RawBookRow[]) : [];
  const books: BookPayload[] = [];
  const seenIds = new Set<string>();

  const pushPayload = (row: RawBookRow) => {
    const payload = toBookPayload(row);
    const key = payload.googleBooksId?.toLowerCase();
    if (!key || seenIds.has(key)) {
      return;
    }
    seenIds.add(key);
    books.push(payload);
  };

  primaryRows.forEach(pushPayload);
  let dbConsumed = primaryRows.length;

  while (books.length < params.limit && !params.subgenreSlug && !params.tagSlug && !params.genreSlug) {
    const remaining = params.limit - books.length;
    const fallbackQuery = genre
      ? await sql`
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn
          FROM books b
          WHERE EXISTS (
            SELECT 1
            FROM unnest(COALESCE(b.categories, ARRAY[]::text[])) AS cat(category)
            WHERE LOWER(cat.category) LIKE ${genrePattern}
          )
          ORDER BY
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END DESC NULLS LAST,
            b.title ASC
          LIMIT ${remaining}
          OFFSET ${params.offset + dbConsumed}
        `
      : await sql`
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn
          FROM books b
          ORDER BY
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END DESC NULLS LAST,
            b.title ASC
          LIMIT ${remaining}
          OFFSET ${params.offset + dbConsumed}
        `;

    const fallbackRows = Array.isArray(fallbackQuery) ? (fallbackQuery as RawBookRow[]) : [];
    dbConsumed += fallbackRows.length;

    if (fallbackRows.length === 0) {
      break;
    }

    let added = 0;
    for (const row of fallbackRows) {
      const before = books.length;
      pushPayload(row);
      if (books.length > before) {
        added++;
        if (books.length >= params.limit) {
          break;
        }
      }
    }

    if (added === 0) {
      continue;
    }
  }

  if (books.length < params.limit && !params.subgenreSlug && !params.tagSlug && !params.genreSlug) {
    const remoteQuery =
      genre && genre.length > 0 ? `subject:${genre}` : "recent fiction releases";
    let remoteCursor = params.offset;
    let attempts = 0;

    while (books.length < params.limit && attempts < 5) {
      const remoteVolumes = await fetchCatalogVolumes(remoteQuery, "newest", remoteCursor);
      remoteCursor += remoteVolumes.length;
      attempts++;

      if (remoteVolumes.length === 0) {
        break;
      }

      for (const volume of remoteVolumes) {
        const payload = seedVolumeToBookPayload(volume);
        if (!payload) {
          continue;
        }
        const key = payload.googleBooksId.toLowerCase();
        if (seenIds.has(key)) {
          continue;
        }
        seenIds.add(key);
        books.push(payload);
        if (books.length >= params.limit) {
          break;
        }
      }
    }
  }

  if (books.length === 0 && params.offset === 0) {
    return fetchPopular(sql, params);
  }

  return books.slice(0, params.limit);
}

async function fetchForYou(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  if (!params.userId) {
    return [];
  }

  const genre = normalizeGenre(params.genre);
  const genrePattern = buildGenrePattern(genre);

  const [{ count }] = (await sql`
    SELECT COUNT(*)::int AS count
    FROM user_books
    WHERE user_id = ${params.userId}
  `) as Array<{ count: number }>;

  if ((count ?? 0) === 0) {
    return fetchPopular(sql, params);
  }

  const queryResult = genre
    ? await sql`
        WITH user_activity AS (
          SELECT
            ub.book_id,
            LOWER(COALESCE(ub.status, '')) AS status,
            ub.rating,
            b.categories
          FROM user_books ub
          INNER JOIN books b ON b.id = ub.book_id
          WHERE ub.user_id = ${params.userId}
        ),
        user_pref AS (
          SELECT
            LOWER(TRIM(cat.category)) AS category,
            SUM(
              CASE
                WHEN status = 'completed' THEN 1.0
                WHEN status = 'reading' THEN 0.6
                WHEN status = 'plan-to-read' THEN 0.45
                WHEN status = 'on-hold' THEN 0.3
                WHEN status = 'dropped' THEN -0.2
                ELSE 0.2
              END
              + COALESCE((rating::float - 50.0) / 100.0, 0)
            ) AS weight
          FROM user_activity ua
          CROSS JOIN LATERAL unnest(COALESCE(ua.categories, ARRAY[]::text[])) AS cat(category)
          GROUP BY LOWER(TRIM(cat.category))
        ),
        candidates AS (
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn,
            COALESCE(bs.average_rating, 0)::float AS avg_rating,
            COALESCE(bs.total_ratings, 0)::float AS rating_count,
            COALESCE(bs.updated_at, now()) AS updated_at,
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END AS published_at
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
          WHERE EXISTS (
            SELECT 1
            FROM unnest(COALESCE(b.categories, ARRAY[]::text[])) AS cat(category)
            WHERE LOWER(cat.category) LIKE ${genrePattern}
          )
          AND (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
          ))
          AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            WHERE bps.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
          ))
          AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
          ))
          -- Block filter: exclude books with blocked tags
          AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
          ))
          -- Domain filter
          AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_domains gd ON gd.genre_id = g.id
            JOIN domains d ON d.id = gd.domain_id
            WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
          ))
          -- Supergenre filter
          AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_supergenres gs ON gs.genre_id = g.id
            JOIN supergenres sp ON sp.id = gs.supergenre_id
            WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
          ))
          -- Format filter  
          AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_formats bf
            JOIN formats f ON f.id = bf.format_id
            WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
          ))
          -- Audience filter
          AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_age_markets bam
            JOIN age_markets am ON am.id = bam.age_market_id
            WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
          ))
          -- Author filter
          AND (${params.authorName ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(b.authors, ARRAY[]::text[])) AS author(name)
            WHERE LOWER(author.name) = LOWER(${params.authorName ?? null})
          ))
          -- Series filter: join books -> editions -> works
          AND (${params.series ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM editions e
            JOIN works w ON w.id = e.work_id
            WHERE e.legacy_book_id = b.id
              AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
              ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql``}
          ))
        ),
        preference_scores AS (
          SELECT
            c.id,
            COALESCE(SUM(up.weight), 0) AS pref_score
          FROM candidates c
          LEFT JOIN LATERAL (
            SELECT LOWER(TRIM(cat.category)) AS category
            FROM unnest(COALESCE(c.categories, ARRAY[]::text[])) AS cat(category)
          ) cats ON TRUE
          LEFT JOIN user_pref up ON up.category = cats.category
          GROUP BY c.id
        ),
        excluded AS (
          SELECT DISTINCT book_id FROM user_books WHERE user_id = ${params.userId}
        )
        SELECT
          c.id,
          c.google_books_id,
          c.title,
          c.authors,
          c.description,
          c.cover_url,
          c.published_date,
          c.page_count,
          c.categories,
          c.isbn,
          COALESCE(pf.pref_score, 0) AS pref_score,
          c.avg_rating,
          c.rating_count,
          c.updated_at,
          c.published_at
        FROM candidates c
        LEFT JOIN preference_scores pf ON pf.id = c.id
        LEFT JOIN excluded ex ON ex.book_id = c.id
        WHERE ex.book_id IS NULL
      ORDER BY
        COALESCE(pf.pref_score, 0) DESC,
        COALESCE(c.published_at, CURRENT_DATE - make_interval(years => ${RECENT_YEARS})) DESC,
        c.avg_rating DESC,
        c.rating_count DESC,
        c.updated_at DESC,
        c.title ASC
        LIMIT ${params.limit}
        OFFSET ${params.offset}
      `
    : await sql`
        WITH user_activity AS (
          SELECT
            ub.book_id,
            LOWER(COALESCE(ub.status, '')) AS status,
            ub.rating,
            b.categories
          FROM user_books ub
          INNER JOIN books b ON b.id = ub.book_id
          WHERE ub.user_id = ${params.userId}
        ),
        user_pref AS (
          SELECT
            LOWER(TRIM(cat.category)) AS category,
            SUM(
              CASE
                WHEN status = 'completed' THEN 1.0
                WHEN status = 'reading' THEN 0.6
                WHEN status = 'plan-to-read' THEN 0.45
                WHEN status = 'on-hold' THEN 0.3
                WHEN status = 'dropped' THEN -0.2
                ELSE 0.2
              END
              + COALESCE((rating::float - 50.0) / 100.0, 0)
            ) AS weight
          FROM user_activity ua
          CROSS JOIN LATERAL unnest(COALESCE(ua.categories, ARRAY[]::text[])) AS cat(category)
          GROUP BY LOWER(TRIM(cat.category))
        ),
        candidates AS (
          SELECT
            b.id,
            b.google_books_id,
            b.title,
            b.authors,
            b.description,
            b.cover_url,
            b.published_date,
            b.page_count,
            b.categories,
            b.isbn,
            COALESCE(bs.average_rating, 0)::float AS avg_rating,
            COALESCE(bs.total_ratings, 0)::float AS rating_count,
            COALESCE(bs.updated_at, now()) AS updated_at,
            CASE
              WHEN b.published_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN to_date(b.published_date, 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}-\\d{2}$' THEN to_date(b.published_date || '-01', 'YYYY-MM-DD')
              WHEN b.published_date ~ '^\\d{4}$' THEN to_date(b.published_date || '-01-01', 'YYYY-MM-DD')
              ELSE NULL
            END AS published_at
          FROM books b
          LEFT JOIN book_stats bs ON bs.book_id = b.id
          WHERE (${params.subgenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            WHERE bps.book_id = b.id AND sg.slug = ${params.subgenreSlug ?? null}
          ))
          AND (${params.genreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            WHERE bps.book_id = b.id AND g.slug = ${params.genreSlug ?? null}
          ))
          AND (${params.tagSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ${params.tagSlug ?? null}
          ))
          -- Block filter: exclude books with blocked tags
          AND (${params.blockedTags ?? null}::text[] IS NULL OR NOT EXISTS (
            SELECT 1 FROM book_cross_tags bct
            JOIN cross_tags ct ON ct.id = bct.cross_tag_id
            WHERE bct.book_id = b.id AND ct.slug = ANY(${params.blockedTags ?? null}::text[])
          ))
          -- Domain filter
          AND (${params.domainSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_domains gd ON gd.genre_id = g.id
            JOIN domains d ON d.id = gd.domain_id
            WHERE bps.book_id = b.id AND d.slug = ${params.domainSlug ?? null}
          ))
          -- Supergenre filter
          AND (${params.supergenreSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_subgenres bps
            JOIN subgenres sg ON sg.id = bps.subgenre_id
            JOIN genres g ON g.id = sg.genre_id
            JOIN genre_supergenres gs ON gs.genre_id = g.id
            JOIN supergenres sp ON sp.id = gs.supergenre_id
            WHERE bps.book_id = b.id AND sp.slug = ${params.supergenreSlug ?? null}
          ))
          -- Format filter  
          AND (${params.formatSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_formats bf
            JOIN formats f ON f.id = bf.format_id
            WHERE bf.book_id = b.id AND f.slug = ${params.formatSlug ?? null}
          ))
          -- Audience filter
          AND (${params.audienceSlug ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM book_age_markets bam
            JOIN age_markets am ON am.id = bam.age_market_id
            WHERE bam.book_id = b.id AND am.slug = ${params.audienceSlug ?? null}
          ))
          -- Series filter: join books -> editions -> works
          AND (${params.series ?? null}::text IS NULL OR EXISTS (
            SELECT 1 FROM editions e
            JOIN works w ON w.id = e.work_id
            WHERE e.legacy_book_id = b.id
              AND LOWER(REPLACE(w.series, ' ', '-')) = LOWER(${params.series ?? null})
              ${params.seriesPosition ? sql`AND w.series_order IS NOT NULL` : sql`AND TRUE`}
          ))
        ),
        preference_scores AS (
          SELECT
            c.id,
            COALESCE(SUM(up.weight), 0) AS pref_score
          FROM candidates c
          LEFT JOIN LATERAL (
            SELECT LOWER(TRIM(cat.category)) AS category
            FROM unnest(COALESCE(c.categories, ARRAY[]::text[])) AS cat(category)
          ) cats ON TRUE
          LEFT JOIN user_pref up ON up.category = cats.category
          GROUP BY c.id
        ),
        excluded AS (
          SELECT DISTINCT book_id FROM user_books WHERE user_id = ${params.userId}
        )
        SELECT
          c.id,
          c.google_books_id,
          c.title,
          c.authors,
          c.description,
          c.cover_url,
          c.published_date,
        c.page_count,
        c.categories,
        c.isbn,
        COALESCE(pf.pref_score, 0) AS pref_score,
        c.avg_rating,
        c.rating_count,
        c.updated_at,
        c.published_at
      FROM candidates c
      LEFT JOIN preference_scores pf ON pf.id = c.id
      LEFT JOIN excluded ex ON ex.book_id = c.id
      WHERE ex.book_id IS NULL
      ORDER BY
        COALESCE(pf.pref_score, 0) DESC,
        COALESCE(c.published_at, CURRENT_DATE - make_interval(years => ${RECENT_YEARS})) DESC,
        c.avg_rating DESC,
        c.rating_count DESC,
        c.updated_at DESC,
        c.title ASC
      LIMIT ${params.limit}
        OFFSET ${params.offset}
      `;

  const rows = Array.isArray(queryResult) ? (queryResult as RawBookRow[]) : [];
  let books = rows.map(toBookPayload);

  if (books.length === 0 && params.offset === 0) {
    return fetchPopular(sql, params);
  }

  const seenIds = new Set(books.map((book) => book.googleBooksId));
  let fallbackCursor = params.offset + rows.length;
  let safety = 0;

  while (books.length < params.limit && safety < 5) {
    const fallback = await fetchPopular(sql, {
      ...params,
      algo: "popular",
      limit: params.limit,
      offset: fallbackCursor,
    });

    fallbackCursor += fallback.length;
    if (fallback.length === 0) {
      break;
    }

    let added = 0;
    for (const book of fallback) {
      if (seenIds.has(book.googleBooksId)) {
        continue;
      }
      seenIds.add(book.googleBooksId);
      books.push(book);
      added++;
      if (books.length >= params.limit) {
        break;
      }
    }

    if (added === 0) {
      safety++;
    }
  }

  return books.slice(0, params.limit);
}

async function handleBrowse(sql: SqlClient, params: BrowseParams): Promise<BookPayload[]> {
  switch (params.algo) {
    case "popular":
      return fetchPopular(sql, params);
    case "rating":
      return fetchHighestRated(sql, params);
    case "recent":
      return fetchRecentlyAdded(sql, params);
    case "for-you":
      return fetchForYou(sql, params);
    default:
      return fetchPopular(sql, params);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const algoParam = (typeof req.query.algo === "string" ? req.query.algo : "").toLowerCase() as BrowseAlgo;
    const algo: BrowseAlgo =
      algoParam === "rating" || algoParam === "recent" || algoParam === "for-you" ? algoParam : "popular";

    const limitRaw = typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : null;
    const offsetRaw = typeof req.query.offset === "string" ? Number.parseInt(req.query.offset, 10) : null;
    const limit = clampLimit(limitRaw, 50, 20);
    const offset = Math.max(0, offsetRaw && !Number.isNaN(offsetRaw) ? offsetRaw : 0);
    const genre = typeof req.query.genre === "string" ? req.query.genre : null;
    const subgenreSlug = typeof req.query.subgenre === "string" ? req.query.subgenre : null;
    const genreSlug = typeof req.query.genreSlug === "string" ? req.query.genreSlug : null;
    const tagSlug = typeof req.query.tag === "string" ? req.query.tag : null;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const tagAnyRaw = typeof req.query.tagAny === "string" ? req.query.tagAny : null;
    const tagAny = tagAnyRaw ? tagAnyRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0) : null;
    const blockedTagsRaw = typeof req.query.blockedTags === "string" ? req.query.blockedTags : null;
    const blockedTags = blockedTagsRaw ? blockedTagsRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0) : null;
    const authorName = typeof req.query.author === "string" ? req.query.author : null;
    const formatSlug = typeof req.query.format === "string" ? req.query.format : null;
    const audienceSlug = typeof req.query.audience === "string" ? req.query.audience : null;
    const domainSlug = typeof req.query.domain === "string" ? req.query.domain : null;
    const supergenreSlug = typeof req.query.supergenre === "string" ? req.query.supergenre : null;
    const seriesSlug = typeof req.query.series === "string" ? req.query.series : null;
    const seriesPosition = typeof req.query.seriesPosition === "string" && req.query.seriesPosition === "true";

    if (algo === "for-you" && !userId) {
      return res.status(400).json({ error: "userId is required for for-you recommendations" });
    }

    const sql = getSql();
    await ensureSchema(sql);
    // TEMPORARILY DISABLED: Auto-seed 400+ books from Google Books
    // TODO: Re-enable after validating batch 1-3 data
    // await ensureCatalogSeed(sql);

    const books = await handleBrowse(sql, {
      algo,
      userId,
      genre,
      genreSlug,
      subgenreSlug,
      tagSlug,
      limit,
      offset,
      tagAny,
      blockedTags,
      authorName,
      formatSlug,
      audienceSlug,
      domainSlug,
      supergenreSlug,
      series: seriesSlug,
      seriesPosition,
    });

    console.log(`[browse] Returning ${books.length} books for algo=${algo}, limit=${limit}, offset=${offset}`);
    res.status(200).json(books);
  } catch (error: any) {
    console.error("Failed to load browse recommendations", error);
    console.error("Error stack:", error?.stack);
    console.error("DATABASE_URL present:", Boolean(process.env.DATABASE_URL));
    res.status(500).json({
      error: "Failed to load browse recommendations",
      debug: String(error?.message || error),
      hasDbUrl: Boolean(process.env.DATABASE_URL || ""),
    });
  }
}
