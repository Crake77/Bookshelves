import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import ProfileStats from "@/components/ProfileStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserBooks, DEMO_USER_ID } from "@/lib/api";

export default function ProfilePage() {
  const { data: userBooks = [] } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  const completedBooks = userBooks.filter(ub => ub.status === "completed");
  const readingBooks = userBooks.filter(ub => ub.status === "reading");

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
            <p className="text-sm text-muted-foreground">Member since 2024</p>
          </div>

          <Button 
            size="icon" 
            variant="ghost"
            data-testid="button-settings"
            onClick={() => console.log("Settings clicked")}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-4 border border-card-border">
            <div className="font-display text-2xl font-semibold text-foreground">
              {completedBooks.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Books Read
            </div>
          </div>
          <div className="rounded-xl bg-card p-4 border border-card-border">
            <div className="font-display text-2xl font-semibold text-foreground">
              {readingBooks.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Currently Reading
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 border border-card-border">
          <h3 className="font-semibold mb-3">Favorite Genres</h3>
          <div className="flex flex-wrap gap-2">
            {["Fantasy", "Science Fiction", "Mystery", "Thriller"].map((genre) => (
              <div
                key={genre}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
              >
                {genre}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 border border-card-border">
          <h3 className="font-semibold mb-3">Reading Goal 2024</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{completedBooks.length} of 50 books</span>
            <span className="text-sm font-medium">{Math.round((completedBooks.length / 50) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((completedBooks.length / 50) * 100, 100)}%` }}
            />
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
