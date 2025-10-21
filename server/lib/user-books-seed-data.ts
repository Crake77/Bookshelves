export const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

export interface SeedBook {
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

export interface SeedUserBook {
  status: string;
  rating: number | null;
  book: SeedBook;
}

export const DEMO_USER_BOOKS: SeedUserBook[] = [
  {
    status: "plan-to-read",
    rating: 92,
    book: {
      googleBooksId: "demo-book-1",
      title: "Legends & Lattes",
      authors: ["Travis Baldree"],
      description:
        "A cosy fantasy about an orc warrior who retires from adventuring to open the first coffee shop in a city that has never tasted coffee.",
      coverUrl: "https://covers.openlibrary.org/b/id/12456984-L.jpg",
      publishedDate: "2022-02-22",
      pageCount: 304,
      categories: ["Fantasy", "Cozy"],
      isbn: "9781250886088",
    },
  },
  {
    status: "plan-to-read",
    rating: null,
    book: {
      googleBooksId: "demo-book-2",
      title: "Tomorrow, and Tomorrow, and Tomorrow",
      authors: ["Gabrielle Zevin"],
      description:
        "Two friends build a beloved video game and navigate fame, creativity, and complicated relationships across three decades.",
      coverUrl: "https://covers.openlibrary.org/b/id/13192829-L.jpg",
      publishedDate: "2022-07-05",
      pageCount: 416,
      categories: ["Fiction", "Literary"],
      isbn: "9780593321201",
    },
  },
  {
    status: "completed",
    rating: 88,
    book: {
      googleBooksId: "demo-book-3",
      title: "Project Hail Mary",
      authors: ["Andy Weir"],
      description:
        "A lone astronaut must save Earth from disaster in this gripping science fiction survival story from the author of The Martian.",
      coverUrl: "https://covers.openlibrary.org/b/id/12170465-L.jpg",
      publishedDate: "2021-05-04",
      pageCount: 496,
      categories: ["Science Fiction"],
      isbn: "9780593135204",
    },
  },
  {
    status: "reading",
    rating: 75,
    book: {
      googleBooksId: "demo-book-4",
      title: "Fourth Wing",
      authors: ["Rebecca Yarros"],
      description:
        "A deadly dragon rider war college tests Violet Sorrengail, who must rely on her wits and lightning bond to survive.",
      coverUrl: "https://covers.openlibrary.org/b/id/12901041-L.jpg",
      publishedDate: "2023-05-02",
      pageCount: 512,
      categories: ["Fantasy", "Romance"],
      isbn: "9781649374042",
    },
  },
  {
    status: "reading",
    rating: null,
    book: {
      googleBooksId: "demo-book-5",
      title: "A Study in Drowning",
      authors: ["Ava Reid"],
      description:
        "A dark academia fantasy steeped in folklore where a scholarship student uncovers secrets hidden within a decaying estate.",
      coverUrl: "https://covers.openlibrary.org/b/id/14622637-L.jpg",
      publishedDate: "2023-09-19",
      pageCount: 384,
      categories: ["Fantasy", "Mystery"],
      isbn: "9780063211506",
    },
  },
  {
    status: "completed",
    rating: 95,
    book: {
      googleBooksId: "demo-book-6",
      title: "The Invisible Life of Addie LaRue",
      authors: ["V. E. Schwab"],
      description:
        "Cursed to be forgotten by everyone she meets, Addie LaRue strikes a bargain that spans centuries and challenges the meaning of a life well lived.",
      coverUrl: "https://covers.openlibrary.org/b/id/10514838-L.jpg",
      publishedDate: "2020-10-06",
      pageCount: 448,
      categories: ["Fantasy", "Historical Fiction"],
      isbn: "9780765387561",
    },
  },
];

