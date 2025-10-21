import RecommendationCard from "../RecommendationCard";

export default function RecommendationCardExample() {
  return (
    <div className="p-4 max-w-md">
      <RecommendationCard
        title="The Fifth Season"
        author="N.K. Jemisin"
        coverUrl="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300"
        rationale="Based on your love for complex world-building and character-driven narratives, this Hugo Award winner will captivate you."
      />
    </div>
  );
}
