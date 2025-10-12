import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNavigation from "@/components/BottomNavigation";
import ShelvesPage from "@/pages/ShelvesPage";
import BrowsePage from "@/pages/BrowsePage";
import ProfilePage from "@/pages/ProfilePage";

function App() {
  const [activeTab, setActiveTab] = useState<"shelves" | "browse" | "profile">("shelves");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case "shelves":
        return <ShelvesPage />;
      case "browse":
        return <BrowsePage />;
      case "profile":
        return <ProfilePage />;
      default:
        return <ShelvesPage />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderPage()}
          <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
