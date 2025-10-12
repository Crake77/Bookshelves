import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Plus, X, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ShelfConfig {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  isPrebuilt: boolean;
}

interface CategoryConfig {
  id: string;
  name: string;
  slug: string;
  isEnabled: boolean;
  isPrebuilt: boolean;
}

interface SettingsPageProps {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  // Default pre-built shelves
  const [shelves, setShelves] = useState<ShelfConfig[]>([
    { id: "1", name: "Reading", slug: "reading", isEnabled: true, isPrebuilt: true },
    { id: "2", name: "Completed", slug: "completed", isEnabled: true, isPrebuilt: true },
    { id: "3", name: "Plan to Read", slug: "plan-to-read", isEnabled: true, isPrebuilt: true },
    { id: "4", name: "On Hold", slug: "on-hold", isEnabled: true, isPrebuilt: true },
    { id: "5", name: "Dropped", slug: "dropped", isEnabled: true, isPrebuilt: true },
  ]);

  // Default browse categories
  const [categories, setCategories] = useState<CategoryConfig[]>([
    { id: "1", name: "Your Next Reads", slug: "your-next-reads", isEnabled: true, isPrebuilt: true },
    { id: "2", name: "New for You", slug: "new-for-you", isEnabled: true, isPrebuilt: true },
    { id: "3", name: "Fantasy", slug: "fantasy", isEnabled: true, isPrebuilt: true },
    { id: "4", name: "Sci-Fi", slug: "sci-fi", isEnabled: true, isPrebuilt: true },
    { id: "5", name: "Mystery", slug: "mystery", isEnabled: true, isPrebuilt: true },
    { id: "6", name: "Romance", slug: "romance", isEnabled: true, isPrebuilt: true },
  ]);

  const [newShelfName, setNewShelfName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const toggleShelf = (id: string) => {
    setShelves(shelves.map(s => 
      s.id === id ? { ...s, isEnabled: !s.isEnabled } : s
    ));
  };

  const toggleCategory = (id: string) => {
    setCategories(categories.map(c => 
      c.id === id ? { ...c, isEnabled: !c.isEnabled } : c
    ));
  };

  const addCustomShelf = () => {
    if (newShelfName.trim()) {
      const slug = newShelfName.toLowerCase().replace(/\s+/g, '-');
      setShelves([...shelves, {
        id: Date.now().toString(),
        name: newShelfName,
        slug,
        isEnabled: true,
        isPrebuilt: false,
      }]);
      setNewShelfName("");
    }
  };

  const addCustomCategory = () => {
    if (newCategoryName.trim()) {
      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-');
      setCategories([...categories, {
        id: Date.now().toString(),
        name: newCategoryName,
        slug,
        isEnabled: true,
        isPrebuilt: false,
      }]);
      setNewCategoryName("");
    }
  };

  const removeCustomShelf = (id: string) => {
    setShelves(shelves.filter(s => s.id !== id));
  };

  const removeCustomCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center h-14 px-4 gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-semibold">Settings</h1>
        </div>
      </div>
      
      <div className="px-4 py-6 space-y-8">
        {/* Shelf Customization */}
        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Customize Your Shelves</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enable or disable shelves, and create custom ones for your reading organization.
          </p>

          <div className="space-y-2 mb-4">
            {shelves.map((shelf) => (
              <Card key={shelf.id} className="p-3 flex items-center justify-between" data-testid={`shelf-${shelf.slug}`}>
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{shelf.name}</span>
                  {!shelf.isPrebuilt && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={shelf.isEnabled}
                    onCheckedChange={() => toggleShelf(shelf.id)}
                    data-testid={`toggle-shelf-${shelf.slug}`}
                  />
                  {!shelf.isPrebuilt && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCustomShelf(shelf.id)}
                      data-testid={`remove-shelf-${shelf.slug}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="New shelf name..."
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomShelf()}
              data-testid="input-new-shelf"
            />
            <Button onClick={addCustomShelf} data-testid="button-add-shelf">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </section>

        {/* Browse Category Customization */}
        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Customize Browse Categories</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which categories appear on your Browse page, and add custom ones.
          </p>

          <div className="space-y-2 mb-4">
            {categories.map((category) => (
              <Card key={category.id} className="p-3 flex items-center justify-between" data-testid={`category-${category.slug}`}>
                <div className="flex items-center gap-3 flex-1">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{category.name}</span>
                  {!category.isPrebuilt && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.isEnabled}
                    onCheckedChange={() => toggleCategory(category.id)}
                    data-testid={`toggle-category-${category.slug}`}
                  />
                  {!category.isPrebuilt && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCustomCategory(category.id)}
                      data-testid={`remove-category-${category.slug}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="New category name (e.g., Thriller)..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomCategory()}
              data-testid="input-new-category"
            />
            <Button onClick={addCustomCategory} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </section>

        <div className="pt-4">
          <Button className="w-full" data-testid="button-save-settings">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
