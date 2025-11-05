import type { BookSearchResult, BrowseAlgo } from "./api";

const BASE_FALLBACK: BookSearchResult[] = [
  {
    googleBooksId: "the-name-of-the-wind",
    title: "The Name of the Wind",
    authors: ["Patrick Rothfuss"],
    description:
      "Kvothe recounts his epic journey from gifted child to legendary arcanist in the immersive debut of the Kingkiller Chronicle.",
    coverUrl: "https://covers.openlibrary.org/b/id/8231856-L.jpg",
    publishedDate: "2007-03-27",
    pageCount: 662,
    categories: ["Fantasy"],
    isbn: "9780756404741",
  },
  {
    googleBooksId: "project-hail-mary",
    title: "Project Hail Mary",
    authors: ["Andy Weir"],
    description:
      "A lone astronaut awakens on a desperate mission to save Earth, forging an unlikely alliance far from home.",
    coverUrl: "https://covers.openlibrary.org/b/id/12170465-L.jpg",
    publishedDate: "2021-05-04",
    pageCount: 496,
    categories: ["Science Fiction"],
    isbn: "9780593135204",
  },
  {
    googleBooksId: "and-then-there-were-none",
    title: "And Then There Were None",
    authors: ["Agatha Christie"],
    description:
      "Ten strangers are summoned to a remote island where a sinister nursery rhyme foretells their fate.",
    coverUrl: "https://covers.openlibrary.org/b/id/8235116-L.jpg",
    publishedDate: "1939-11-06",
    pageCount: 264,
    categories: ["Mystery", "Thriller"],
    isbn: "9780062073488",
  },
  // REMOVED: Red Rising - not in database
  // This fallback should only be used if API fails completely
  {
    googleBooksId: "fourth-wing",
    title: "Fourth Wing",
    authors: ["Rebecca Yarros"],
    description:
      "At Basgiath War College, fragile scribe Violet Sorrengail must survive brutal trials to bond a dragon or die.",
    coverUrl: "https://covers.openlibrary.org/b/id/13112541-L.jpg",
    publishedDate: "2023-05-02",
    pageCount: 512,
    categories: ["Fantasy", "Romance"],
    isbn: "9781649374042",
  },
  // REMOVED: Legends & Lattes - not in database
  // This fallback should only be used if API fails completely
  {
    googleBooksId: "the-silent-patient",
    title: "The Silent Patient",
    authors: ["Alex Michaelides"],
    description:
      "A celebrated painter shoots her husband and never speaks again, leaving a psychotherapist obsessed with uncovering why.",
    coverUrl: "https://covers.openlibrary.org/b/id/10587966-L.jpg",
    publishedDate: "2019-02-05",
    pageCount: 336,
    categories: ["Mystery", "Thriller"],
    isbn: "9781250301697",
  },
  {
    googleBooksId: "seven-husbands-evelyn-hugo",
    title: "The Seven Husbands of Evelyn Hugo",
    authors: ["Taylor Jenkins Reid"],
    description:
      "A reclusive Hollywood icon recounts the dizzying highs and heartbreaking choices behind her seven marriages.",
    coverUrl: "https://covers.openlibrary.org/b/id/12585920-L.jpg",
    publishedDate: "2017-06-13",
    pageCount: 400,
    categories: ["Historical Fiction", "Romance"],
    isbn: "9781501139239",
  },
  {
    googleBooksId: "dune",
    title: "Dune",
    authors: ["Frank Herbert"],
    description:
      "Paul Atreides navigates destiny, politics, and prophecy on the desert world of Arrakis.",
    coverUrl: "https://covers.openlibrary.org/b/id/12619845-L.jpg",
    publishedDate: "1965-08-01",
    pageCount: 688,
    categories: ["Science Fiction"],
    isbn: "9780441172719",
  },
  {
    googleBooksId: "lessons-in-chemistry",
    title: "Lessons in Chemistry",
    authors: ["Bonnie Garmus"],
    description:
      "In the 1960s, chemist Elizabeth Zott becomes an unlikely television cooking star while challenging societal expectations.",
    coverUrl: "https://covers.openlibrary.org/b/id/12594946-L.jpg",
    publishedDate: "2022-04-05",
    pageCount: 390,
    categories: ["Historical Fiction"],
    isbn: "9780385547345",
  },
  {
    googleBooksId: "house-in-the-cerulean-sea",
    title: "The House in the Cerulean Sea",
    authors: ["TJ Klune"],
    description:
      "A caseworker overseeing magical youth discovers a found family who will change his life forever.",
    coverUrl: "https://covers.openlibrary.org/b/id/10361783-L.jpg",
    publishedDate: "2020-03-17",
    pageCount: 400,
    categories: ["Fantasy"],
    isbn: "9781250217288",
  },
  {
    googleBooksId: "beach-read",
    title: "Beach Read",
    authors: ["Emily Henry"],
    description:
      "Two writers with opposing styles swap genres for the summer, confronting their pasts and unexpected sparks.",
    coverUrl: "https://covers.openlibrary.org/b/id/10324633-L.jpg",
    publishedDate: "2020-05-19",
    pageCount: 384,
    categories: ["Romance"],
    isbn: "9781984806734",
  },
];

function filterByGenre(books: BookSearchResult[], genre?: string): BookSearchResult[] {
  if (!genre) return books;
  const lowerGenre = genre.toLowerCase();
  const filtered = books.filter((book) =>
    (book.categories ?? []).some((cat) => cat.toLowerCase().includes(lowerGenre))
  );
  return filtered.length > 0 ? filtered : books;
}

export function getFallbackBrowse(algo: BrowseAlgo, genre?: string): BookSearchResult[] {
  const base = filterByGenre(BASE_FALLBACK, genre);
  switch (algo) {
    case "recent":
      return [...base].sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""));
    case "rating":
      return [...base].sort((a, b) => (b.pageCount ?? 0) - (a.pageCount ?? 0));
    case "for-you":
      return [...base].sort((a, b) => a.title.localeCompare(b.title));
    case "popular":
    default:
      return base;
  }
}
