import { Book } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  status?: string; // Supports both default and custom shelf slugs
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
  const statusColors: Record<string, string> = {
    reading: "bg-chart-3/20 text-chart-3 border-chart-3",
    completed: "bg-chart-3/20 text-chart-3 border-chart-3",
    "on-hold": "bg-chart-4/20 text-chart-4 border-chart-4",
    dropped: "bg-destructive/20 text-destructive border-destructive",
    "plan-to-read": "bg-chart-1/20 text-chart-1 border-chart-1",
  };
  
  // Get status color, use primary color for custom shelves
  const getStatusColor = (status: string) => {
    return statusColors[status] || "bg-primary/20 text-primary border-primary";
  };

  // Check if this is a placeholder cover
  const isPlaceholder = coverUrl?.startsWith("placeholder:");
  const placeholderData = isPlaceholder && coverUrl ? {
    title: decodeURIComponent(coverUrl.split(":")[1] || title),
    author: decodeURIComponent(coverUrl.split(":")[2] || author)
  } : null;

  return (
    <div
      data-testid={`book-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden shadow-lg hover-elevate active-elevate-2 cursor-pointer transition-transform"
    >
      <div className="aspect-[2/3] relative">
        {coverUrl && !isPlaceholder ? (
          <img 
            src={coverUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M30,70 Q30,50 40,40 L45,35 Q50,30 50,20 L50,0" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="35" cy="45" r="3" fill="currentColor" />
                <circle cx="40" cy="55" r="2" fill="currentColor" />
              </svg>
            </div>
            
            {/* No Image Available text */}
            <div className="relative z-10 text-center">
              <Book className="w-10 h-10 text-muted-foreground/40 mb-3 mx-auto" />
              <div className="text-xs text-muted-foreground/60 font-medium mb-2">No image available</div>
              <div className="text-sm font-semibold text-foreground/80 line-clamp-3 px-2">
                {placeholderData?.title || title}
              </div>
              {(placeholderData?.author || author) && (
                <div className="text-xs text-muted-foreground/70 mt-2 line-clamp-1">
                  by {placeholderData?.author || author}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none" />
        
        {status && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium border ${getStatusColor(status)}`}>
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
