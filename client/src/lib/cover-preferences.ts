/**
 * Cover Preferences Storage
 * 
 * Manages user preferences for book covers:
 * - Per-book cover selection (localStorage)
 * - Series-wide standardization (default behavior)
 */

const COVER_PREFERENCES_KEY = "bookshelves:cover-preferences";

export interface CoverPreference {
  bookId: string; // googleBooksId or legacy book ID
  editionId: string; // Edition ID to use
  coverUrl: string; // Preferred cover URL
  timestamp: string; // When preference was set
}

export interface CoverPreferences {
  [bookId: string]: CoverPreference;
}

function readFromStorage(): CoverPreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COVER_PREFERENCES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CoverPreferences;
  } catch (error) {
    console.warn("[cover-preferences] failed to parse storage", error);
    return {};
  }
}

function writeToStorage(preferences: CoverPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COVER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("[cover-preferences] failed to write storage", error);
  }
}

/**
 * Get user's preferred cover for a book
 */
export function getCoverPreference(bookId: string): CoverPreference | null {
  const preferences = readFromStorage();
  return preferences[bookId] || null;
}

/**
 * Set user's preferred cover for a book
 */
export function setCoverPreference(bookId: string, editionId: string, coverUrl: string) {
  const preferences = readFromStorage();
  preferences[bookId] = {
    bookId,
    editionId,
    coverUrl,
    timestamp: new Date().toISOString(),
  };
  writeToStorage(preferences);
  
  // Dispatch event for other components to react
  window.dispatchEvent(new CustomEvent("bookshelves:cover-preference-changed", {
    detail: { bookId, editionId, coverUrl }
  }));
}

/**
 * Clear user's cover preference for a book (revert to default)
 */
export function clearCoverPreference(bookId: string) {
  const preferences = readFromStorage();
  delete preferences[bookId];
  writeToStorage(preferences);
  
  window.dispatchEvent(new CustomEvent("bookshelves:cover-preference-changed", {
    detail: { bookId, editionId: null, coverUrl: null }
  }));
}

/**
 * Get all cover preferences
 */
export function getAllCoverPreferences(): CoverPreferences {
  return readFromStorage();
}

