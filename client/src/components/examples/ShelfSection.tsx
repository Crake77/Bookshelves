import ShelfSection from "../ShelfSection";
import BookCard from "../BookCard";

export default function ShelfSectionExample() {
  return (
    <div className="max-w-md p-4">
      <ShelfSection title="Reading" count={3} defaultOpen={true}>
        <div className="grid grid-cols-2 gap-3 px-4">
          <BookCard
            title="Project Hail Mary"
            author="Andy Weir"
            status="reading"
          />
          <BookCard
            title="The Way of Kings"
            author="Brandon Sanderson"
            status="reading"
          />
        </div>
      </ShelfSection>
    </div>
  );
}
