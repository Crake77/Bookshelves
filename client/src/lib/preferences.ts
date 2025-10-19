export type ShelfPreference = {
  slug: string;
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
};

export type CategoryPreference = {
  slug: string;
  name: string;
  categoryType: "system" | "genre" | "custom";
  isEnabled: boolean;
  isDefault: boolean;
  subgenreSlug?: string;
  subgenreName?: string;
  tagSlugs?: string[];
  tagNames?: string[];
};

const SHELVES_STORAGE_KEY = "bookshelves:shelves-preferences";
const LEGACY_SHELVES_STORAGE_KEY = "bookshelves:settings-shelves-preferences";
const CATEGORIES_STORAGE_KEY = "bookshelves:categories-preferences";
const PREFERENCES_EVENT = "bookshelves:preferences-updated";

export const DEFAULT_SHELVES: ShelfPreference[] = [
  { name: "Reading", slug: "reading", isEnabled: true, isDefault: true },
  { name: "Completed", slug: "completed", isEnabled: true, isDefault: true },
  { name: "Plan to Read", slug: "plan-to-read", isEnabled: true, isDefault: true },
  { name: "On Hold", slug: "on-hold", isEnabled: true, isDefault: true },
  { name: "Dropped", slug: "dropped", isEnabled: true, isDefault: true },
];

export const DEFAULT_CATEGORIES: CategoryPreference[] = [
  {
    name: "Fantasy",
    slug: "fantasy",
    categoryType: "genre",
    isEnabled: true,
    isDefault: true,
  },
  {
    name: "Sci-Fi",
    slug: "sci-fi",
    categoryType: "genre",
    isEnabled: true,
    isDefault: true,
  },
  {
    name: "Mystery",
    slug: "mystery",
    categoryType: "genre",
    isEnabled: true,
    isDefault: true,
  },
  {
    name: "Romance",
    slug: "romance",
    categoryType: "genre",
    isEnabled: true,
    isDefault: true,
  },
];

type StoredShelfPreference = ShelfPreference;
type StoredCategoryPreference = CategoryPreference;

function readFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[preferences] failed to parse storage for ${key}`, error);
    return null;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[preferences] failed to write storage for ${key}`, error);
  }
}

function dispatchPreferencesEvent(detail: { target: "shelves" | "categories" }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail }));
}

export function loadShelfPreferences(): ShelfPreference[] {
  let stored = readFromStorage<StoredShelfPreference[]>(SHELVES_STORAGE_KEY);

  if (!stored) {
    const legacy = readFromStorage<{ order?: string[]; defaultEnabled?: Record<string, boolean> }>(
      LEGACY_SHELVES_STORAGE_KEY,
    );
    if (legacy) {
      const order = legacy.order ?? DEFAULT_SHELVES.map((item) => item.slug);
      stored = order.map((slug) => {
        const defaultShelf = DEFAULT_SHELVES.find((item) => item.slug === slug);
        return {
          slug,
          name: defaultShelf?.name ?? slug.replace(/-/g, " "),
          isEnabled: legacy.defaultEnabled?.[slug] ?? true,
          isDefault: Boolean(defaultShelf),
        } satisfies ShelfPreference;
      });
    }
  }
  const map = new Map<string, ShelfPreference>();

  if (stored) {
    stored.forEach((item) => {
      map.set(item.slug, {
        ...item,
        isDefault: DEFAULT_SHELVES.some((defaultShelf) => defaultShelf.slug === item.slug),
      });
    });
  }

  DEFAULT_SHELVES.forEach((defaultShelf) => {
    const existing = map.get(defaultShelf.slug);
    if (existing) {
      map.set(defaultShelf.slug, {
        ...defaultShelf,
        isEnabled: existing.isEnabled,
      });
    } else {
      map.set(defaultShelf.slug, defaultShelf);
    }
  });

  return Array.from(map.values());
}

export function saveShelfPreferences(preferences: ShelfPreference[]) {
  writeToStorage(
    SHELVES_STORAGE_KEY,
    preferences.map(({ isDefault: _isDefault, ...rest }) => rest),
  );
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(LEGACY_SHELVES_STORAGE_KEY);
  }
  dispatchPreferencesEvent({ target: "shelves" });
}

export function loadCategoryPreferences(): CategoryPreference[] {
  let stored = readFromStorage<StoredCategoryPreference[]>(CATEGORIES_STORAGE_KEY);

  if (stored) {
    stored = stored.filter(
      (item) => item.slug !== "your-next-reads" && item.slug !== "new-for-you",
    );
  } else {
    stored = DEFAULT_CATEGORIES.map((category) => ({ ...category }));
  }
  const map = new Map<string, CategoryPreference>();

  if (stored) {
    stored.forEach((item) => {
      map.set(item.slug, {
        ...item,
        isDefault: DEFAULT_CATEGORIES.some((defaultCategory) => defaultCategory.slug === item.slug),
      });
    });
  }

  return Array.from(map.values());
}

export function saveCategoryPreferences(preferences: CategoryPreference[]) {
  writeToStorage(
    CATEGORIES_STORAGE_KEY,
    preferences.map(({ isDefault: _isDefault, ...rest }) => rest),
  );
  dispatchPreferencesEvent({ target: "categories" });
}

export function onPreferencesChange(listener: (detail: { target: "shelves" | "categories" }) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ target: "shelves" | "categories" }>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  };

  window.addEventListener(PREFERENCES_EVENT, handler);
  return () => window.removeEventListener(PREFERENCES_EVENT, handler);
}

export function normaliseSlugBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateUniqueSlug(base: string, existing: Set<string>): string {
  let candidate = normaliseSlugBase(base);
  if (!candidate) {
    candidate = "item";
  }

  let suffix = 1;
  let uniqueCandidate = candidate;
  while (existing.has(uniqueCandidate)) {
    suffix += 1;
    uniqueCandidate = `${candidate}-${suffix}`;
  }
  return uniqueCandidate;
}
