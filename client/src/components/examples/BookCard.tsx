import BookCard from "../BookCard";

export default function BookCardExample() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 max-w-md">
      <BookCard
        title="The Name of the Wind"
        author="Patrick Rothfuss"
        coverUrl="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"
        status="reading"
      />
      <BookCard
        title="Mistborn: The Final Empire"
        author="Brandon Sanderson"
        status="plan-to-read"
        releaseInfo="Premieres in 4 months"
      />
    </div>
  );
}
