import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNavigation from "@/components/BottomNavigation";
import InstallPrompt from "@/components/InstallPrompt";
import ShelvesPage from "@/pages/ShelvesPage";
import BrowsePage from "@/pages/BrowsePage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";

function App() {
  const [activeTab, setActiveTab] = useState<"shelves" | "browse" | "profile">("shelves");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.log('Service Worker registration failed', err));
    }
  }, []);

  const renderPage = () => {
    if (showSettings) {
      return <SettingsPage onBack={() => setShowSettings(false)} />;
    }

    switch (activeTab) {
      case "shelves":
        return <ShelvesPage />;
      case "browse":
        return <BrowsePage />;
      case "profile":
        return <ProfilePage onOpenSettings={() => setShowSettings(true)} />;
      default:
        return <ShelvesPage />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {renderPage()}
          {!showSettings && <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />}
          <InstallPrompt />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
