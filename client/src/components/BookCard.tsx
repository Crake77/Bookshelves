import { Book } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  status?: "reading" | "completed" | "on-hold" | "dropped" | "plan-to-read";
  releaseInfo?: string;
  onClick?: () => void;
}

export default function BookCard({ 
  title, 
  author, 
  coverUrl, 
  status,
  releaseInfo,
  onClick 
}: BookCardProps) {
  const statusColors = {
    reading: "bg-chart-3/20 text-chart-3 border-chart-3",
    completed: "bg-chart-3/20 text-chart-3 border-chart-3",
    "on-hold": "bg-chart-4/20 text-chart-4 border-chart-4",
    dropped: "bg-destructive/20 text-destructive border-destructive",
    "plan-to-read": "bg-chart-1/20 text-chart-1 border-chart-1",
  };

  return (
    <div
      data-testid={`book-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden shadow-lg hover-elevate active-elevate-2 cursor-pointer transition-transform"
    >
      <div className="aspect-[2/3] relative">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full gradient-card flex items-center justify-center">
            <Book className="w-12 h-12 text-foreground/30" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {status && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium border ${statusColors[status]}`}>
            {status.replace("-", " ")}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-sm line-clamp-2 text-foreground drop-shadow-lg">
            {title}
          </h3>
          <p className="text-xs text-foreground/80 mt-1 drop-shadow-lg">
            {author}
          </p>
          {releaseInfo && (
            <p className="text-xs text-chart-3 mt-1 drop-shadow-lg font-medium">
              {releaseInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
