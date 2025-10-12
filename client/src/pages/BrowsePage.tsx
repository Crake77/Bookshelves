import AppHeader from "@/components/AppHeader";
import BookCard from "@/components/BookCard";
import GenreCard from "@/components/GenreCard";
import RecommendationCard from "@/components/RecommendationCard";
import { ChevronRight } from "lucide-react";

export default function BrowsePage() {
  const upcomingBooks = [
    { title: "The Winds of Winter", author: "George R.R. Martin", releaseInfo: "Premieres in 6 months" },
    { title: "Doors of Stone", author: "Patrick Rothfuss", releaseInfo: "Premieres in 8 months" },
  ];

  const genres = [
    { name: "Fantasy", count: 42, color: "250 70% 60%" },
    { name: "Science Fiction", count: 28, color: "210 80% 55%" },
    { name: "Mystery", count: 15, color: "140 60% 50%" },
    { name: "Romance", count: 12, color: "340 70% 60%" },
  ];

  const recommendations = [
    {
      title: "The Fifth Season",
      author: "N.K. Jemisin",
      rationale: "Based on your love for complex world-building and character-driven narratives.",
    },
    {
      title: "Children of Time",
      author: "Adrian Tchaikovsky",
      rationale: "Similar themes to the sci-fi novels you've been enjoying lately.",
    },
  ];

  return (
    <div className="pb-20">
      <AppHeader title="Discover" />
      
      <div className="px-4 py-4 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Upcoming Releases</h2>
            <button className="text-sm text-primary flex items-center gap-1 hover-elevate px-2 py-1 rounded">
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {upcomingBooks.map((book) => (
              <div key={book.title} className="w-32 flex-shrink-0">
                <BookCard
                  title={book.title}
                  author={book.author}
                  releaseInfo={book.releaseInfo}
                  onClick={() => console.log(`Clicked ${book.title}`)}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Browse by Genre</h2>
            <button className="text-sm text-primary flex items-center gap-1 hover-elevate px-2 py-1 rounded">
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {genres.map((genre) => (
              <GenreCard
                key={genre.name}
                genre={genre.name}
                bookCount={genre.count}
                color={genre.color}
                onClick={() => console.log(`Clicked ${genre.name}`)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">AI Recommended</h2>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.title}
                title={rec.title}
                author={rec.author}
                rationale={rec.rationale}
                onClick={() => console.log(`Clicked ${rec.title}`)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
