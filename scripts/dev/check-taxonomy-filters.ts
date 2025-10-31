import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE_URL = process.env.FILTER_CHECK_BASE_URL?.replace(/\/+$/, "");

if (!BASE_URL && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run this script");
}

type Handler = (req: any, res: any) => Promise<void> | void;

async function callHandler<T>(
  handlerOrUrl: Handler | string,
  query: Record<string, string | string[] | undefined>,
): Promise<{ status: number; body: T }>;
async function callHandler<T>(
  handlerOrUrl: Handler | string,
  query: Record<string, string | string[] | undefined>,
): Promise<{ status: number; body: T }> {
  if (BASE_URL) {
    if (typeof handlerOrUrl !== "string") {
      throw new Error("Expected endpoint path string when using FILTER_CHECK_BASE_URL");
    }
    const url = new URL(handlerOrUrl, BASE_URL);
    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === "undefined") return;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v));
      } else {
        url.searchParams.set(key, value);
      }
    });
    const response = await fetch(url.toString(), { method: "GET" });
    const body = (await response.json()) as T;
    return { status: response.status, body };
  }

  if (typeof handlerOrUrl === "string") {
    throw new Error("Expected handler function when not using FILTER_CHECK_BASE_URL");
  }
  const handler = handlerOrUrl;
  const req = { method: "GET", query } as any;
  return new Promise<{ status: number; body: T }>((resolve, reject) => {
    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader: (key: string, value: string) => {
        res.headers[key] = value;
      },
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      json(payload: T) {
        resolve({ status: res.statusCode, body: payload });
        return res;
      },
      end(payload?: any) {
        resolve({ status: res.statusCode, body: payload });
        return res;
      },
    };

    Promise.resolve(handler(req, res)).catch(reject);
  });
}

async function main() {
  const browseEndpoint: Handler | string = BASE_URL
    ? "/api/browse"
    : (await import("../../server/api-handlers/browse")).default;
  const taxonomyEndpoint: Handler | string = BASE_URL
    ? "/api/book-taxonomy"
    : (await import("../../server/api-handlers/book-taxonomy")).default;

  const base = await callHandler<any[]>(browseEndpoint, {
    algo: "popular",
    limit: "10",
  });

  if (base.status !== 200 || !Array.isArray(base.body) || base.body.length === 0) {
    console.error("Failed to fetch base browse set", base);
    process.exit(1);
  }

  console.log(`Fetched ${base.body.length} base books`);

  interface SampleFilters {
    tag?: { slug: string; label: string };
    subgenre?: { slug: string; label: string };
    format?: { slug: string; label: string };
    audience?: { slug: string; label: string };
  }

  const samples: SampleFilters = {};
  let author: string | undefined;

  const slugify = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const toOption = (value: any) => {
    if (!value) return undefined;
    if (typeof value === "string") {
      const slug = slugify(value);
      return { slug: slug.length > 0 ? slug : value, label: value };
    }
    if (typeof value === "object" && typeof value.slug === "string") {
      return { slug: value.slug, label: value.name ?? value.slug };
    }
    return undefined;
  };

  for (const book of base.body) {
    if (!author && Array.isArray(book.authors) && book.authors.length > 0) {
      author = book.authors[0];
    }

    if ((samples.tag && samples.subgenre && samples.format && samples.audience) && author) break;

    const taxonomy = await callHandler<{ ok: boolean; data?: any }>(taxonomyEndpoint, {
      googleBooksId: book.googleBooksId,
    });

    if (taxonomy.status !== 200 || !taxonomy.body?.ok || !taxonomy.body.data) {
      continue;
    }

    const data = taxonomy.body.data;

    if (!samples.tag && Array.isArray(data.tags) && data.tags.length > 0) {
      const tag = data.tags.find((t: any) => typeof t.slug === "string");
      if (tag) {
        samples.tag = { slug: tag.slug, label: tag.name ?? tag.slug };
      }
    }

    if (!samples.subgenre && data.subgenre?.slug) {
      samples.subgenre = { slug: data.subgenre.slug, label: data.subgenre.name ?? data.subgenre.slug };
    }

    if (!samples.format) {
      const option = toOption(data.format);
      if (option) samples.format = option;
    }

    if (!samples.audience) {
      const option = toOption(data.ageMarket ?? data.audience);
      if (option) samples.audience = option;
    }
  }

  if (!samples.tag || !samples.subgenre || !samples.format || !samples.audience || !author) {
    console.warn("Insufficient taxonomy data to validate all filters", { samples, author });
  }

  async function validateFilter(
    description: string,
    query: Record<string, string>,
    predicate: (book: any) => Promise<boolean> | boolean,
  ) {
    const response = await callHandler<any[]>(browseEndpoint, {
      ...query,
      algo: "popular",
      limit: "6",
    });

    if (response.status !== 200) {
      console.error(`${description}: request failed`, response);
      return;
    }

    const books = response.body;
    console.log(`${description}: returned ${books.length} book(s)`);

    if (books.length === 0) {
      console.log(`  ✔ ${description}: no results (empty set)`);
      return;
    }

    for (const book of books) {
      const passes = await predicate(book);
      if (!passes) {
        console.warn(`  ✖ ${description}: book ${book.title} did not meet filter criteria`);
        return;
      }
    }

    console.log(`  ✔ ${description}: all books match filter`);
  }

  if (samples.tag) {
    await validateFilter(
      `Tag filter (${samples.tag.label})`,
      { tag: samples.tag.slug },
      async (book) => {
        const taxonomy = await callHandler<{ ok: boolean; data?: any }>(taxonomyEndpoint, { googleBooksId: book.googleBooksId });
        const tags: any[] = taxonomy.body?.data?.tags ?? [];
        return tags.some((t) => t.slug === samples.tag!.slug);
      },
    );
  }

  if (samples.subgenre) {
    await validateFilter(
      `Subgenre filter (${samples.subgenre.label})`,
      { subgenre: samples.subgenre.slug },
      async (book) => {
        const taxonomy = await callHandler<{ ok: boolean; data?: any }>(taxonomyEndpoint, { googleBooksId: book.googleBooksId });
        return taxonomy.body?.data?.subgenre?.slug === samples.subgenre!.slug;
      },
    );
  }

  if (samples.format) {
    await validateFilter(
      `Format filter (${samples.format.label})`,
      { format: samples.format.slug },
      async (book) => {
        const taxonomy = await callHandler<{ ok: boolean; data?: any }>(taxonomyEndpoint, { googleBooksId: book.googleBooksId });
        return taxonomy.body?.data?.format?.slug === samples.format!.slug;
      },
    );
  }

  if (samples.audience) {
    await validateFilter(
      `Audience filter (${samples.audience.label})`,
      { audience: samples.audience.slug },
      async (book) => {
        const taxonomy = await callHandler<{ ok: boolean; data?: any }>(taxonomyEndpoint, { googleBooksId: book.googleBooksId });
        const slug = taxonomy.body?.data?.ageMarket?.slug ?? taxonomy.body?.data?.audience?.slug;
        return slug === samples.audience!.slug;
      },
    );
  }

  if (author) {
    await validateFilter(
      `Author filter (${author})`,
      { author },
      async (book) => Array.isArray(book.authors) && book.authors.includes(author!),
    );
  }

  await validateFilter(
    "Non-existent tag filter (expect empty)",
    { tag: "non-existent-slug-for-test" },
    async () => false,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
