import { Sparkles, Book } from "lucide-react";

interface RecommendationCardProps {
  title: string;
  author: string;
  coverUrl?: string;
  rationale: string;
  onClick?: () => void;
}

export default function RecommendationCard({ 
  title, 
  author, 
  coverUrl,
  rationale,
  onClick 
}: RecommendationCardProps) {
  return (
    <div
      data-testid={`recommendation-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden shadow-xl hover-elevate active-elevate-2 cursor-pointer transition-all border-2 border-transparent"
      style={{
        borderImage: "linear-gradient(135deg, hsl(250 70% 60%), hsl(210 80% 55%)) 1",
      }}
    >
      <div className="flex gap-3 p-4 bg-card/50 backdrop-blur">
        <div className="w-20 h-28 rounded-md overflow-hidden flex-shrink-0 shadow-lg">
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full gradient-card flex items-center justify-center">
              <Book className="w-8 h-8 text-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              AI Recommended
            </span>
          </div>
          
          <h3 className="font-semibold text-sm line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            {author}
          </p>
          
          <p className="text-xs text-foreground/90 italic line-clamp-2">
            "{rationale}"
          </p>
        </div>
      </div>
    </div>
  );
}
