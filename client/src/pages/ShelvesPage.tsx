import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import ShelfSection from "@/components/ShelfSection";
import BookCard from "@/components/BookCard";

export default function ShelvesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const shelves: Array<{
    name: string;
    count: number;
    books: Array<{ title: string; author: string; releaseInfo?: string }>;
  }> = [
    {
      name: "Reading",
      count: 3,
      books: [
        { title: "Project Hail Mary", author: "Andy Weir" },
        { title: "The Way of Kings", author: "Brandon Sanderson" },
        { title: "Leviathan Wakes", author: "James S.A. Corey" },
      ],
    },
    {
      name: "Completed",
      count: 42,
      books: [
        { title: "Dune", author: "Frank Herbert" },
        { title: "The Hobbit", author: "J.R.R. Tolkien" },
      ],
    },
    {
      name: "On Hold",
      count: 5,
      books: [
        { title: "Words of Radiance", author: "Brandon Sanderson" },
      ],
    },
    {
      name: "Dropped",
      count: 2,
      books: [
        { title: "Moby Dick", author: "Herman Melville" },
      ],
    },
    {
      name: "Plan to Read",
      count: 28,
      books: [
        { title: "The Fifth Season", author: "N.K. Jemisin", releaseInfo: "Premieres in 4 months" },
        { title: "Children of Time", author: "Adrian Tchaikovsky", releaseInfo: "Episode 3 airs in 5 days" },
      ],
    },
  ];

  return (
    <div className="pb-20">
      <AppHeader 
        title="Books" 
        subtitle="Up-to-date. Last updated: 1 day ago" 
      />
      
      <div className="px-4 py-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onFilterClick={() => console.log("Filter clicked")}
          placeholder="Filter by name"
        />
      </div>

      <div className="px-2">
        {shelves.map((shelf) => (
          <ShelfSection
            key={shelf.name}
            title={shelf.name}
            count={shelf.count}
            defaultOpen={shelf.name === "Plan to Read"}
          >
            <div className="grid grid-cols-2 gap-3 px-4">
              {shelf.books.map((book) => (
                <BookCard
                  key={book.title}
                  title={book.title}
                  author={book.author}
                  status={shelf.name.toLowerCase().replace(/\s+/g, "-") as any}
                  releaseInfo={book.releaseInfo}
                  onClick={() => console.log(`Clicked ${book.title}`)}
                />
              ))}
            </div>
          </ShelfSection>
        ))}
      </div>
    </div>
  );
}
