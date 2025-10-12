import { LibraryBig, Compass, User } from "lucide-react";

interface BottomNavigationProps {
  activeTab: "shelves" | "browse" | "profile";
  onTabChange: (tab: "shelves" | "browse" | "profile") => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "shelves" as const, label: "Shelves", icon: LibraryBig },
    { id: "browse" as const, label: "Browse", icon: Compass },
    { id: "profile" as const, label: "Username", icon: User },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-lg border-t border-card-border rounded-t-2xl z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-full items-center justify-around px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-lg transition-all ${
                isActive ? "text-primary scale-105" : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="text-[11px] font-medium uppercase tracking-wide">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
