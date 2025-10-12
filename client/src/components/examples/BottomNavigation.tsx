import { useState } from "react";
import BottomNavigation from "../BottomNavigation";

export default function BottomNavigationExample() {
  const [activeTab, setActiveTab] = useState<"shelves" | "browse" | "profile">("shelves");

  return (
    <div className="h-32 relative">
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
