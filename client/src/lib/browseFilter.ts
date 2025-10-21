// client/src/lib/browseFilter.ts
// Simple cross-session filter handoff between components/pages.

export type BrowseFilter =
  | { kind: "genre"; slug: string; label: string }
  | { kind: "subgenre"; slug: string; label: string }
  | { kind: "tag"; slug: string; label: string };

const STORAGE_KEY = "bookshelves:pending-browse-filter";

export function setPendingBrowseFilter(filter: BrowseFilter) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  } catch {}
}

export function consumePendingBrowseFilter(): BrowseFilter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as BrowseFilter;
  } catch {
    return null;
  }
}

export function navigateToBrowseWithFilter(filter: BrowseFilter) {
  setPendingBrowseFilter(filter);
  // Fire a global event to request tab change to Browse
  try {
    window.dispatchEvent(new CustomEvent("bookshelves:navigate", { detail: { tab: "browse" } }));
  } catch {}
}

