/*
  scripts/taxonomy-audit.ts
  Samples up to 500 books from Google Books across diverse queries and reports where
  detectTaxonomy finds no primary subgenre and zero tags. Writes a summary to
  scripts/taxonomy-audit.report.json and prints top missing categories.
*/
import { detectTaxonomy } from "../shared/taxonomy";

type Volume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    pageCount?: number;
  };
};

type Book = {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  categories?: string[];
  pageCount?: number;
};

const QUERIES: Array<{ q: string; pages?: number; orderBy?: "relevance" | "newest" }> = [
  { q: "subject:Nonfiction", pages: 10 },
  { q: "subject:Self-Help", pages: 6 },
  { q: "subject:Psychology", pages: 6 },
  { q: "subject:Philosophy", pages: 6 },
  { q: "subject:Religion", pages: 6 },
  { q: "subject:History", pages: 6 },
  { q: "subject:Biography", pages: 6 },
  { q: "subject:Business", pages: 6 },
  { q: "subject:Economics", pages: 6 },
  { q: "subject:Finance", pages: 6 },
  { q: "subject:Education", pages: 6 },
  { q: "subject:Travel", pages: 4 },
  { q: "subject:Cooking", pages: 4 },
  { q: "subject:Parenting", pages: 4 },
  { q: "subject:Sports", pages: 4 },
  { q: "subject:Technology", pages: 6 },
  { q: "subject:Computer Science", pages: 6 },
  { q: "subject:Programming", pages: 6 },
  { q: "subject:Health & Fitness", pages: 4 },
  { q: "subject:Art", pages: 4 },
  { q: "subject:Music", pages: 4 },
  { q: "subject:Film", pages: 4 },
  { q: "positive thinking", pages: 2 },
  { q: "time management", pages: 2 },
  { q: "habits", pages: 2 },
  { q: "leadership", pages: 2 },
  { q: "entrepreneurship", pages: 2 },
  { q: "investment", pages: 2 },
  { q: "mindfulness meditation", pages: 2 },
  { q: "subject:Fantasy", pages: 4 },
  { q: "subject:Science Fiction", pages: 4 },
  { q: "subject:Mystery", pages: 2 },
  { q: "subject:Romance", pages: 2 },
];

async function fetchVolumes(q: string, startIndex = 0, orderBy: "relevance" | "newest" = "relevance"): Promise<Volume[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", orderBy);
  url.searchParams.set("startIndex", String(startIndex));
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const payload = (await res.json()) as { items?: Volume[] };
  return payload.items ?? [];
}

function toBook(v: Volume): Book | null {
  const id = v.id || v.volumeInfo?.title;
  const title = v.volumeInfo?.title;
  const authors = Array.isArray(v.volumeInfo?.authors) && v.volumeInfo!.authors!.length > 0 ? v.volumeInfo!.authors! : ["Unknown Author"];
  if (!id || !title) return null;
  return {
    id,
    title,
    authors,
    description: v.volumeInfo?.description ?? undefined,
    categories: v.volumeInfo?.categories ?? undefined,
    pageCount: v.volumeInfo?.pageCount ?? undefined,
  };
}

function normalizeCat(cat: string): string {
  return cat.trim().toLowerCase();
}

async function main() {
  const seen = new Set<string>();
  const books: Book[] = [];
  for (const entry of QUERIES) {
    let page = 0;
    const pages = entry.pages ?? 2;
    while (books.length < 500 && page < pages) {
      const vols = await fetchVolumes(entry.q, page * 20, entry.orderBy);
      page += 1;
      if (vols.length === 0) break;
      for (const v of vols) {
        const b = toBook(v);
        if (!b) continue;
        if (seen.has(b.id)) continue;
        seen.add(b.id);
        books.push(b);
        if (books.length >= 500) break;
      }
    }
    if (books.length >= 500) break;
  }

  const gaps: Book[] = [];
  const categoryCounts = new Map<string, number>();
  const tokenCounts = new Map<string, number>();

  for (const b of books) {
    const det = detectTaxonomy(b.title, b.description, b.categories);
    if (!det.primarySubgenre && (det.crossTags?.length ?? 0) === 0) {
      gaps.push(b);
      for (const c of b.categories ?? []) {
        const key = normalizeCat(c);
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
        for (const token of key.split(/[\s/,&]+/g)) {
          const t = token.trim();
          if (t.length >= 4) tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
        }
      }
    }
  }

  const topCategories = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40);
  const topTokens = Array.from(tokenCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40);

  const summary = {
    sampled: books.length,
    gaps: gaps.length,
    topCategories,
    topTokens,
  } as const;

  console.log("Taxonomy audit summary:\n", JSON.stringify(summary, null, 2));
  const fs = await import("node:fs/promises");
  await fs.writeFile("scripts/taxonomy-audit.report.json", JSON.stringify(summary, null, 2), "utf-8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

