import { useEffect, useState } from "react";
import {
  loadShelfPreferences,
  loadCategoryPreferences,
  onPreferencesChange,
  type ShelfPreference,
  type CategoryPreference,
} from "@/lib/preferences";

export function useShelfPreferences(): ShelfPreference[] {
  const [shelves, setShelves] = useState<ShelfPreference[]>(() => loadShelfPreferences());

  useEffect(() => {
    setShelves(loadShelfPreferences());
    const unsubscribe = onPreferencesChange((detail) => {
      if (detail.target === "shelves") {
        setShelves(loadShelfPreferences());
      }
    });
    return unsubscribe;
  }, []);

  return shelves;
}

export function useCategoryPreferences(): CategoryPreference[] {
  const [categories, setCategories] = useState<CategoryPreference[]>(() => loadCategoryPreferences());

  useEffect(() => {
    setCategories(loadCategoryPreferences());
    const unsubscribe = onPreferencesChange((detail) => {
      if (detail.target === "categories") {
        setCategories(loadCategoryPreferences());
      }
    });
    return unsubscribe;
  }, []);

  return categories;
}
