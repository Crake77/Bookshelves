interface GenreCardProps {
  genre: string;
  bookCount: number;
  coverUrl?: string;
  color?: string;
  onClick?: () => void;
}

export default function GenreCard({ 
  genre, 
  bookCount, 
  coverUrl,
  color = "250 70% 60%",
  onClick 
}: GenreCardProps) {
  return (
    <div
      data-testid={`genre-card-${genre.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden aspect-[3/2] hover-elevate active-elevate-2 cursor-pointer transition-all"
    >
      {coverUrl ? (
        <img 
          src={coverUrl} 
          alt={genre}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full gradient-card" />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div 
          className="w-1 h-12 absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
          style={{ backgroundColor: `hsl(${color})` }}
        />
        <h3 className="font-display font-semibold text-lg pl-3">
          {genre}
        </h3>
        <p className="text-sm text-muted-foreground pl-3">
          {bookCount} books
        </p>
      </div>
    </div>
  );
}
