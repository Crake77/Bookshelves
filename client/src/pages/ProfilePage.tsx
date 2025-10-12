import { useQuery, useMutation } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import ProfileStats from "@/components/ProfileStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserBooks, DEMO_USER_ID } from "@/lib/api";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ProfilePageProps {
  onOpenSettings: () => void;
}

export default function ProfilePage({ onOpenSettings }: ProfilePageProps) {
  const { toast } = useToast();
  const [embeddingStatus, setEmbeddingStatus] = useState<any>(null);
  
  const { data: userBooks = [] } = useQuery({
    queryKey: ["/api/user-books", DEMO_USER_ID],
    queryFn: () => getUserBooks(DEMO_USER_ID),
  });

  const { data: missingEmbeddings } = useQuery<{ count: number; books: any[] }>({
    queryKey: ["/api/books/missing-embeddings"],
    refetchInterval: 30000,
  });

  const batchEmbeddingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/batch/generate-embeddings", {
        delayMs: 5000,
        limit: 10,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setEmbeddingStatus(data);
      
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/books/missing-embeddings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-books", DEMO_USER_ID] });
      
      if (data.quotaExceeded) {
        toast({
          title: "Quota Limit Reached",
          description: "OpenAI quota exceeded. Please try again later or upgrade your quota.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Batch Job Complete",
          description: `✓ ${data.successCount} embeddings generated, ✗ ${data.errorCount} failed`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Batch Job Failed",
        description: error.message,
        variant: "destructive",
      });
    },
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
            onClick={onOpenSettings}
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

        <div className="rounded-xl bg-card p-4 border border-card-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">AI Embeddings</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {missingEmbeddings?.count || 0} books need embeddings
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            data-testid="button-generate-embeddings"
            onClick={() => batchEmbeddingMutation.mutate()}
            disabled={batchEmbeddingMutation.isPending || !missingEmbeddings?.count}
          >
            {batchEmbeddingMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating Embeddings...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Embeddings
              </>
            )}
          </Button>

          {embeddingStatus && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>✓ Success: {embeddingStatus.successCount}</div>
              <div>✗ Failed: {embeddingStatus.errorCount}</div>
            </div>
          )}
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
