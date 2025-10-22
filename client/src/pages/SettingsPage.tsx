import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Card as _Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { CategoryPreference, ShelfPreference } from "@/lib/preferences";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SHELVES,
  generateUniqueSlug,
  loadCategoryPreferences,
  loadShelfPreferences,
  saveCategoryPreferences,
  saveShelfPreferences,
} from "@/lib/preferences";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import TaxonomyFilterV2 from "@/components/TaxonomyFilterV2";
import { useTaxonomyFilter, categoryPreferenceToFilterDimensions, filterDimensionsToCategoryPreference } from "@/hooks/useTaxonomyFilter";
import { createFilterState, loadTaxonomyData } from "@/lib/taxonomyFilter";

interface SettingsPageProps {
  onBack: () => void;
}

type ShelfItem = ShelfPreference & { id: string };
type CategoryItem = CategoryPreference & { id: string };

const ROW_HEIGHT = 64;

function normaliseCategoryType(value: string): CategoryPreference["categoryType"] {
  if (value === "system" || value === "genre" || value === "custom") {
    return value;
  }
  return "custom";
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const [shelves, setShelves] = useState<ShelfItem[]>(() =>
    loadShelfPreferences().map((shelf) => ({ ...shelf, id: shelf.slug }))
  );
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    loadCategoryPreferences().map((category) => ({ ...category, id: category.slug }))
  );

  const [newShelfName, setNewShelfName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableGenres, setAvailableGenres] = useState<Array<{ slug: string; name: string }>>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingShelfDelete, setPendingShelfDelete] = useState<ShelfItem | null>(null);
  const [pendingCategoryDelete, setPendingCategoryDelete] = useState<CategoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryItem | null>(null);
  const [editSubgenreSlug, setEditSubgenreSlug] = useState<string | null>(null);
  const [editSubgenreName, setEditSubgenreName] = useState<string | null>(null);
  const [editTagSlugs, setEditTagSlugs] = useState<string[]>([]);
  const [editTagNames, setEditTagNames] = useState<string[]>([]);
  const [allSubgenres, setAllSubgenres] = useState<Array<{ slug: string; name: string; genre_slug?: string }>>([]);
  const [allTags, setAllTags] = useState<Array<{ slug: string; name: string; group: string }>>([]);
  const [tagSearch, setTagSearch] = useState("");
  
  // Modern taxonomy filter for category configuration
  const categoryTaxonomyFilter = useTaxonomyFilter();
const [dragState, setDragState] = useState<{
  type: "shelf" | "category";
  id: string;
  startY: number;
  offset: number;
  pointerId: number;
  targetIndex: number | null;
} | null>(null);

  const draggingShelfId = dragState?.type === "shelf" ? dragState.id : null;
  const draggingCategoryId = dragState?.type === "category" ? dragState.id : null;
  const shelvesListRef = useRef<HTMLDivElement>(null);
  const categoriesListRef = useRef<HTMLDivElement>(null);

  const isDefaultShelf = useMemo(() => new Set(DEFAULT_SHELVES.map((shelf) => shelf.slug)), []);
  const isDefaultCategory = useMemo(
    () => new Set(DEFAULT_CATEGORIES.map((category) => category.slug)),
    []
  );

  const markDirty = () => {
    setIsDirty(true);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Load available genres for the genre dropdown using new taxonomy system
  useEffect(() => {
    const loadGenres = async () => {
      try {
        // Use the new taxonomy loader with caching
        const taxonomyData = await loadTaxonomyData(100);
        setAvailableGenres(taxonomyData.genres.map((g) => ({ slug: g.slug, name: g.name })));
      } catch (error) {
        console.warn('Failed to load available genres', error);
        // Fallback to old API if new system fails
        try {
          const res = await fetch('/api/taxonomy-list?limit=50');
          if (res.ok) {
            const data = await res.json();
            setAvailableGenres((data.genres ?? []).map((g: any) => ({ slug: g.slug, name: g.name })));
          }
        } catch (fallbackError) {
          console.warn('Fallback genre loading also failed', fallbackError);
        }
      }
    };
    void loadGenres();
  }, []);

  const moveItem = useCallback(<T extends { id: string }>(items: T[], sourceId: string, targetIndex: number | null): T[] => {
    if (!sourceId) return items;
    const updated = [...items];
    const fromIndex = updated.findIndex((item) => item.id === sourceId);
    if (fromIndex === -1) return items;
    const [moved] = updated.splice(fromIndex, 1);

    let insertIndex = targetIndex ?? updated.length;
    if (fromIndex < insertIndex) {
      insertIndex = Math.max(0, insertIndex - 1);
    }
    insertIndex = Math.max(0, Math.min(insertIndex, updated.length));

    updated.splice(insertIndex, 0, moved);

    const changed = updated.some((item, index) => item.id !== items[index]?.id);
    return changed ? updated : items;
  }, []);

  const beginDrag = useCallback(
    (type: "shelf" | "category", id: string, event: ReactPointerEvent<HTMLElement>) => {
      if (dragState) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget && event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {}
      }
      setDragState({
        type,
        id,
        startY: event.clientY,
        offset: 0,
        pointerId: event.pointerId,
        targetIndex: null,
      });
    },
    [dragState],
  );

  const finishDrag = useCallback(() => {
    setDragState((state) => {
      if (!state) return null;
      if (state.type === "shelf") {
        let changed = false;
        setShelves((prev) => {
          const next = moveItem(prev, state.id, state.targetIndex);
          if (next !== prev) changed = true;
          return next;
        });
        if (changed) markDirty();
      } else {
        let changed = false;
        setCategories((prev) => {
          const next = moveItem(prev, state.id, state.targetIndex);
          if (next !== prev) changed = true;
          return next;
        });
        if (changed) markDirty();
      }
      return null;
    });
  }, [markDirty, moveItem, setShelves, setCategories]);

  const computeTargetIndex = useCallback(
    (type: "shelf" | "category", id: string, clientY: number, offset: number): number | null => {
      if (!shelvesListRef.current || !categoriesListRef.current) return null;
      const items = type === "shelf" ? shelves : categories;
      const container = type === "shelf" ? shelvesListRef.current : categoriesListRef.current;
      const elementMap = new Map<string, HTMLElement>();
      container.querySelectorAll<HTMLElement>(`[data-item-type='${type}']`).forEach((el) => {
        const itemId = el.dataset.itemId;
        if (itemId) {
          elementMap.set(itemId, el);
        }
      });

      const dragIndex = items.findIndex((item) => item.id === id);
      if (dragIndex === -1) return null;
      if (Math.abs(offset) < ROW_HEIGHT * 0.2) {
        return null;
      }

      if (offset > 0) {
        let candidate = dragIndex;
        for (let i = dragIndex + 1; i < items.length; i++) {
          const element = elementMap.get(items[i].id);
          if (!element) continue;
          const rect = element.getBoundingClientRect();
          if (clientY > rect.top + rect.height / 2) {
            candidate = i;
          } else {
            break;
          }
        }
        if (candidate === dragIndex) {
          return null;
        }
        return candidate + 1;
      }

      if (offset < 0) {
        let candidate = dragIndex;
        for (let i = dragIndex - 1; i >= 0; i--) {
          const element = elementMap.get(items[i].id);
          if (!element) continue;
          const rect = element.getBoundingClientRect();
          if (clientY < rect.top + rect.height / 2) {
            candidate = i;
          } else {
            break;
          }
        }
        if (candidate === dragIndex) {
          return null;
        }
        return candidate;
      }

      return null;
    },
    [shelves, categories],
  );

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const offset = event.clientY - dragState.startY;
      const targetIndex = computeTargetIndex(dragState.type, dragState.id, event.clientY, offset);
      setDragState((state) =>
        state && state.pointerId === event.pointerId ? { ...state, offset, targetIndex } : state,
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      if ((event.target as HTMLElement | null)?.releasePointerCapture) {
        try {
          (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        } catch {}
      }
      finishDrag();
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      setDragState(null);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
    const previousUserSelect = document.body.style.userSelect;
    const previousWebkitUserSelect = (document.body.style as any).webkitUserSelect;
    document.body.style.userSelect = "none";
    (document.body.style as any).webkitUserSelect = "none";

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
      document.body.style.userSelect = previousUserSelect;
      (document.body.style as any).webkitUserSelect = previousWebkitUserSelect;
    };
  }, [dragState, finishDrag, computeTargetIndex]);

  const toggleShelf = (slug: string) => {
    setShelves((prev) => {
      const updated = prev.map((shelf) =>
        shelf.slug === slug ? { ...shelf, isEnabled: !shelf.isEnabled } : shelf
      );
      markDirty();
      return updated;
    });
  };

  const toggleCategory = (slug: string) => {
    setCategories((prev) => {
      const updated = prev.map((category) =>
        category.slug === slug ? { ...category, isEnabled: !category.isEnabled } : category
      );
      markDirty();
      return updated;
    });
  };

  const addCustomShelf = () => {
    const trimmed = newShelfName.trim();
    if (!trimmed) return;

    const existingSlugs = new Set(shelves.map((shelf) => shelf.slug));
    const slug = generateUniqueSlug(trimmed, existingSlugs);

    const newShelf: ShelfItem = {
      id: slug,
      slug,
      name: trimmed,
      isEnabled: true,
      isDefault: false,
    };

    setShelves((prev) => [...prev, newShelf]);
    setNewShelfName("");
    markDirty();
  };

  const addCustomCategory = () => {
    if (!newCategorySlug) return;
    
    // Find the genre name from the available genres
    const genre = availableGenres.find((g) => g.slug === newCategorySlug);
    if (!genre) return;

    // Check if this genre is already in the list
    const existingSlugs = new Set(categories.map((category) => category.slug));
    if (existingSlugs.has(newCategorySlug)) {
      setErrorMessage(`${genre.name} is already in your browse categories.`);
      return;
    }

    const newCategory: CategoryItem = {
      id: newCategorySlug,
      slug: newCategorySlug,
      name: genre.name,
      categoryType: "genre",
      isEnabled: true,
      isDefault: false,
    };

    setCategories((prev) => [...prev, newCategory]);
    setNewCategorySlug("");
    markDirty();
  };

  const removeCustomShelf = (slug: string) => {
    setShelves((prev) => prev.filter((shelf) => shelf.slug !== slug));
    markDirty();
  };

  const removeCustomCategory = (slug: string) => {
    setCategories((prev) => prev.filter((category) => category.slug !== slug));
    markDirty();
  };

  

  const openEditForCategory = async (category: CategoryItem) => {
    setEditCategory(category);
    setEditSubgenreSlug(category.subgenreSlug ?? null);
    setEditSubgenreName(category.subgenreName ?? null);
    setEditTagSlugs([...(category.tagSlugs ?? [])]);
    setEditTagNames([...(category.tagNames ?? [])]);
    
    // Initialize taxonomy filter with current category settings
    const categoryPreference = {
      slug: category.slug,
      name: category.name,
      categoryType: category.categoryType,
      isEnabled: category.isEnabled,
      isDefault: category.isDefault,
      subgenreSlug: category.subgenreSlug,
      subgenreName: category.subgenreName,
      tagSlugs: category.tagSlugs ?? [],
      tagNames: category.tagNames ?? [],
    };
    
    const filterDimensions = categoryPreferenceToFilterDimensions(categoryPreference);
    categoryTaxonomyFilter.setFilterState(createFilterState(filterDimensions));
    
    // Load legacy taxonomy lists for backward compatibility
    if (allSubgenres.length === 0 || allTags.length === 0) {
      try {
        const res = await fetch(`/api/taxonomy-list?limit=500`);
        if (res.ok) {
          const data = await res.json();
          setAllSubgenres((data.subgenres ?? []).map((sg: any) => ({ slug: sg.slug, name: sg.name, genre_slug: sg.genre_slug })));
          setAllTags((data.tags ?? []).map((t: any) => ({ slug: t.slug, name: t.name, group: t.group })));
        }
      } catch {}
    }
    setEditOpen(true);
  };

  const toggleEditTag = (tag: { slug: string; name: string }) => {
    setEditTagSlugs((prev) => {
      const idx = prev.indexOf(tag.slug);
      if (idx >= 0) {
        setEditTagNames((names) => names.filter((_, i) => i !== idx));
        return prev.filter((s) => s !== tag.slug);
      }
      setEditTagNames((names) => [...names, tag.name]);
      return [...prev, tag.slug];
    });
  };

  const saveEdit = () => {
    if (!editCategory) return;
    setCategories((prev) => prev.map((cat) => (
      cat.id === editCategory.id
        ? { ...cat, subgenreSlug: editSubgenreSlug ?? undefined, subgenreName: editSubgenreName ?? undefined, tagSlugs: editTagSlugs, tagNames: editTagNames }
        : cat
    )));
    setEditOpen(false);
    markDirty();
  };

  const handleConfirmShelfDelete = () => {
    if (!pendingShelfDelete) return;
    removeCustomShelf(pendingShelfDelete.slug);
    setPendingShelfDelete(null);
  };

  const handleConfirmCategoryDelete = () => {
    if (!pendingCategoryDelete) return;
    removeCustomCategory(pendingCategoryDelete.slug);
    setPendingCategoryDelete(null);
  };

  const handleSave = async () => {
    if (isSaving || !isDirty) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const shelvesToPersist: ShelfPreference[] = shelves.map((shelf) => ({
        slug: shelf.slug,
        name: shelf.isDefault
          ? DEFAULT_SHELVES.find((item) => item.slug === shelf.slug)?.name ?? shelf.name
          : shelf.name.trim(),
        isEnabled: shelf.isEnabled,
        isDefault: isDefaultShelf.has(shelf.slug),
      }));

      const categoriesToPersist: CategoryPreference[] = categories.map((category) => ({
        slug: category.slug,
        name: category.isDefault
          ? DEFAULT_CATEGORIES.find((item) => item.slug === category.slug)?.name ?? category.name
          : category.name.trim(),
        categoryType: category.isDefault
          ? normaliseCategoryType(
              DEFAULT_CATEGORIES.find((item) => item.slug === category.slug)?.categoryType ??
                category.categoryType,
            )
          : normaliseCategoryType(category.categoryType),
        isEnabled: category.isEnabled,
        isDefault: isDefaultCategory.has(category.slug),
        subgenreSlug: category.subgenreSlug,
        subgenreName: category.subgenreName,
        tagSlugs: category.tagSlugs ?? [],
        tagNames: category.tagNames ?? [],
      }));

      saveShelfPreferences(shelvesToPersist);
      saveCategoryPreferences(categoriesToPersist);
      setShelves(shelvesToPersist.map((pref) => ({ ...pref, id: pref.slug })));
      setCategories(categoriesToPersist.map((pref) => ({ ...pref, id: pref.slug })));
      setSuccessMessage("Settings saved.");
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save preferences", error);
      setErrorMessage("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const ROW_HEIGHT = 64;

  const getRowStyle = useCallback(
    (type: "shelf" | "category", index: number, isDraggingRow: boolean): CSSProperties => {
      if (!dragState || dragState.type !== type) {
        return {
          transform: "translate3d(0, 0, 0)",
          transition: "transform 120ms ease",
          position: "relative",
          zIndex: 0,
        };
      }

      if (isDraggingRow) {
        return {
          transform: `translate3d(0, ${dragState.offset}px, 0)`,
          pointerEvents: "none",
          zIndex: 50,
          boxShadow: "0 22px 44px rgba(15, 23, 42, 0.28)",
          transition: "transform 0s",
          position: "relative",
        };
      }

      const items = type === "shelf" ? shelves : categories;
      const dragIndex = items.findIndex((item) => item.id === dragState.id);
      if (dragIndex === -1 || dragState.targetIndex === null) {
        return {
          transform: "translate3d(0, 0, 0)",
          transition: "transform 120ms ease",
          position: "relative",
          zIndex: 0,
        };
      }

      const targetIndex = dragState.targetIndex;

      let translate = 0;
      if (dragIndex < targetIndex) {
        const adjusted = Math.min(targetIndex - 1, items.length - 1);
        if (index > dragIndex && index <= adjusted) {
          translate = -ROW_HEIGHT;
        }
      } else if (dragIndex > targetIndex) {
        const adjusted = Math.max(targetIndex, 0);
        if (index >= adjusted && index < dragIndex) {
          translate = ROW_HEIGHT;
        }
      }

      return {
        transform: `translate3d(0, ${translate}px, 0)`,
        transition: "transform 120ms ease",
        position: "relative",
        zIndex: 0,
      };
    },
    [dragState, shelves, categories],
  );

  const renderShelfRow = (shelf: ShelfItem, index: number) => {
    const isDragging = draggingShelfId === shelf.id;
    const style = getRowStyle("shelf", index, isDragging);

    return (
      <Card
        key={shelf.id}
        className={`min-h-[56px] p-3 flex items-center justify-between transition-all ${
          isDragging
            ? "ring-2 ring-primary/40 shadow-xl scale-[1.01] bg-background"
            : "hover:shadow-md"
        }`}
        data-item-type="shelf"
        data-item-id={shelf.id}
        data-testid={`shelf-${shelf.slug}`}
        style={style}
      >
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onPointerDown={(event) => beginDrag("shelf", shelf.id, event)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab hover:bg-muted hover:text-foreground"
            }`}
            aria-label={`Reorder ${shelf.name}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="font-medium">{shelf.name}</span>
          {!shelf.isDefault && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!shelf.isDefault && (
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setPendingShelfDelete(shelf)}
              data-testid={`remove-shelf-${shelf.slug}`}
              aria-label={`Delete ${shelf.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Switch
            checked={shelf.isEnabled}
            onCheckedChange={() => toggleShelf(shelf.slug)}
            data-testid={`toggle-shelf-${shelf.slug}`}
          />
        </div>
      </Card>
    );
  };

  const renderCategoryRow = (category: CategoryItem, index: number) => {
    const isDragging = draggingCategoryId === category.id;
    const style = getRowStyle("category", index, isDragging);

    return (
      <Card
        key={category.id}
        className={`min-h-[56px] p-3 flex items-center justify-between transition-all ${
          isDragging
            ? "ring-2 ring-primary/40 shadow-xl scale-[1.01] bg-background"
            : "hover:shadow-md"
        }`}
        data-item-type="category"
        data-item-id={category.id}
        data-testid={`category-${category.slug}`}
        style={style}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onPointerDown={(event) => beginDrag("category", category.id, event)}
            className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab hover:bg-muted hover:text-foreground"
            }`}
            aria-label={`Reorder ${category.name}`}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-sm">
              <span className="font-semibold">{category.name}</span>
              {category.subgenreName && (
                <>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="text-primary">{category.subgenreName}</span>
                </>
              )}
            </div>
            {Array.isArray(category.tagNames) && category.tagNames.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {category.tagNames.slice(0, 8).map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-foreground/80">{t}</span>
                ))}
                {category.tagNames.length > 8 && (
                  <span className="text-xs text-muted-foreground">+{category.tagNames.length - 8} more</span>
                )}
              </div>
            )}
          </div>
          {!category.isDefault && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex-shrink-0">
              Custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" variant="secondary" onClick={() => openEditForCategory(category)} data-testid={`configure-category-${category.slug}`}>
            + Subgenre / Tags
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setPendingCategoryDelete(category)}
            data-testid={`remove-category-${category.slug}`}
            aria-label={`Delete ${category.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Switch
            checked={category.isEnabled}
            onCheckedChange={() => toggleCategory(category.slug)}
            data-testid={`toggle-category-${category.slug}`}
          />
        </div>
      </Card>
    );
  };

  return (
    <>
      <div className="pb-20">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center h-14 px-4 gap-3">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          <h1 className="font-display text-xl font-semibold">Settings</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Customize Your Shelves</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Toggle shelves to hide them from lists and status menus. Turning a shelf off keeps existing
            books on that shelf unchanged.
          </p>

          <div
            ref={shelvesListRef}
            className="space-y-2 mb-4"
            data-list="shelves"
          >
            {shelves.map((shelf, index) => renderShelfRow(shelf, index))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="New shelf name..."
              value={newShelfName}
              onChange={(event) => {
                setNewShelfName(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomShelf();
                }
              }}
              data-testid="input-new-shelf"
            />
            <Button onClick={addCustomShelf} data-testid="button-add-shelf">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold mb-4">Customize Browse Categories</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Reorder or hide browse carousels. Custom categories will appear after the featured
            carousel on the Discover tab.
          </p>

          <div
            ref={categoriesListRef}
            className="space-y-2 mb-4"
            data-list="categories"
          >
            {categories.map((category, index) => renderCategoryRow(category, index))}
          </div>

          <div className="flex gap-2">
            <Select value={newCategorySlug} onValueChange={(value) => {
              setNewCategorySlug(value);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}>
              <SelectTrigger className="flex-1" data-testid="select-new-category">
                <SelectValue placeholder="Select a genre to add..." />
              </SelectTrigger>
              <SelectContent>
                {availableGenres
                  .filter((g) => !categories.some((c) => c.slug === g.slug))
                  .map((genre) => (
                    <SelectItem key={genre.slug} value={genre.slug}>
                      {genre.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button onClick={addCustomCategory} disabled={!newCategorySlug} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          
        </section>

        <div className="pt-4 space-y-2">
          {errorMessage && (
            <div className="text-sm text-destructive" role="alert">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="text-sm text-green-600" role="status">
              {successMessage}
            </div>
          )}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            data-testid="button-save-settings"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
      </div>
      <AlertDialog open={Boolean(pendingShelfDelete)} onOpenChange={(open) => { if (!open) setPendingShelfDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingShelfDelete
                ? `Delete the "${pendingShelfDelete.name}" shelf from your settings? Existing books will keep their current status.`
                : "Delete this shelf?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingShelfDelete(null)}>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmShelfDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingCategoryDelete)} onOpenChange={(open) => { if (!open) setPendingCategoryDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCategoryDelete
                ? `Delete the "${pendingCategoryDelete.name}" browse category? This removes its carousel from Discover.`
                : "Delete this category?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCategoryDelete(null)}>Keep</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmCategoryDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configure Category Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Category: {editCategory?.name}</DialogTitle>
            <DialogDescription>
              Use the modern taxonomy system to configure filters, or the legacy interface for backward compatibility.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Modern Taxonomy Interface */}
            <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <h3 className="font-semibold text-primary">Modern Taxonomy System</h3>
                <div className="ml-auto px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  Recommended
                </div>
              </div>
              <TaxonomyFilterV2
                filterState={categoryTaxonomyFilter.filterState}
                onFilterChange={categoryTaxonomyFilter.setFilterState}
              />
            </div>
            
            {/* Legacy Interface */}
            <div className="border border-muted rounded-lg p-4 bg-muted/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <h3 className="font-medium text-muted-foreground">Legacy Interface</h3>
                <div className="ml-auto px-2 py-1 bg-muted/20 text-muted-foreground text-xs rounded-full">
                  Backward Compatibility
                </div>
              </div>
            <div>
              <div className="text-sm font-medium mb-2">Subgenre</div>
              <Select value={editSubgenreSlug ?? ""} onValueChange={(val) => {
                const sg = (allSubgenres as any[]).find((x) => x.slug === val);
                setEditSubgenreSlug(val || null);
                setEditSubgenreName(sg?.name ?? null);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={editSubgenreName || "Select a subgenre"} />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {(() => {
                    if (!editCategory) return allSubgenres.slice(0, 200).map((sg) => (
                      <SelectItem key={sg.slug} value={sg.slug}>{sg.name}</SelectItem>
                    ));
                    // Filter subgenres by genre_slug - this is the official parent link in the database
                    const categorySlug = editCategory.slug.toLowerCase();
                    const filtered = allSubgenres.filter((sg) => (sg.genre_slug || '').toLowerCase() === categorySlug);
                    return filtered.slice(0, 200).map((sg) => (
                      <SelectItem key={sg.slug} value={sg.slug}>{sg.name}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Add Tags</div>
              <Input placeholder="Search tags…" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} />
              <div className="mt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {allTags
                  .filter((t) => {
                    if (!editCategory) return true;
                    const q = tagSearch.toLowerCase();
                    const rel = ["tropes_themes", "setting", "tone_mood", "format"]; // relevance groups
                    const okGroup = rel.includes(t.group);
                    const okSearch = !q || t.name.toLowerCase().includes(q) || t.group.toLowerCase().includes(q);
                    return okGroup && okSearch;
                  })
                  .slice(0, 40)
                  .map((t) => {
                    const selected = editTagSlugs.includes(t.slug);
                    return (
                      <button
                        type="button"
                        key={t.slug}
                        onClick={() => toggleEditTag(t)}
                        className={`text-xs px-2 py-1 rounded-full border ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80 hover:bg-muted/80'}`}
                        aria-pressed={selected}
                      >
                        {t.name}
                      </button>
                    );
                  })}
              </div>
            </div>
            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={saveEdit}>Save Legacy Changes</Button>
            </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => setEditOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (!editCategory) return;
                  
                  // Convert taxonomy filter to category preference
                  const updatedCategory = filterDimensionsToCategoryPreference(
                    categoryTaxonomyFilter.filterState.dimensions,
                    editCategory
                  );
                  
                  // Update categories state
                  setCategories((prev) => prev.map((cat) => 
                    cat.id === editCategory.id ? { ...cat, ...updatedCategory } : cat
                  ));
                  
                  setEditOpen(false);
                  markDirty();
                }}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Save Taxonomy Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
