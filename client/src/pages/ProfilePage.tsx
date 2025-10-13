import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import ProfileStats from "@/components/ProfileStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Api, type BookSearchResult } from "@/lib/api";

interface ProfilePageProps {
  onOpenSettings: () => void;
}

type BrowseRow = {
  id: string;
  title: string;
  items: BookSearchResult[];
};

export default function ProfilePage({ onOpenSettings }: ProfilePageProps) {
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Api.browseRows()
      .then((data) => setRows(data.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const totalBooks = useMemo(
    () => rows.reduce((count, row) => count + row.items.length, 0),
    [rows]
  );

  const favoriteGenres = useMemo(() => rows.map((row) => row.title).slice(0, 4), [rows]);

  return (
    <div className="pb-20">
      <AppHeader title="Profile" />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=reader" />
            <AvatarFallback className="bg-primary text-primary-foreground font-display text-2xl">
              BL
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="font-display text-xl font-semibold">BookLover_42</h2>
            <p className="text-sm text-muted-foreground">Discovering books powered by Open Library</p>
          </div>

          <Button
            size="icon"
            variant="ghost"
            data-testid="button-settings"
            onClick={onOpenSettings}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <ProfileStats
          totalBooks={totalBooks}
          completedBooks={Math.round(totalBooks * 0.4)}
          readingStreak={favoriteGenres.length * 3}
          currentlyReading={Math.max(1, Math.round(totalBooks * 0.1))}
          loading={loading}
        />

        <div className="rounded-xl bg-card p-4 border border-card-border">
          <h3 className="font-semibold mb-3">Favorite Genres</h3>
          <div className="flex flex-wrap gap-2">
            {(favoriteGenres.length > 0 ? favoriteGenres : ["Fantasy", "Science Fiction", "Mystery", "Thriller"]).map((genre) => (
              <div
                key={genre}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
              >
                {genre}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 border border-card-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Discovery Feed</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? "Loading new picks..." : `${rows.length} curated rows ready`}
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>Trending genres refreshed daily from Open Library.</div>
            <div>Tap into Browse to explore each curated shelf.</div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          data-testid="button-logout"
          onClick={() => console.log("Logout clicked")}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
