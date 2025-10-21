import GenreCard from "../GenreCard";

export default function GenreCardExample() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 max-w-md">
      <GenreCard
        genre="Fantasy"
        bookCount={42}
        color="250 70% 60%"
      />
      <GenreCard
        genre="Science Fiction"
        bookCount={28}
        color="210 80% 55%"
      />
    </div>
  );
}
