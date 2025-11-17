/**
 * Utility script to clear cover preferences for testing
 * Run in browser console or Node.js environment
 */

if (typeof window !== "undefined") {
  // Browser environment
  const keysToClear = [];
  
  // Find all cover preference keys
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && (key.startsWith("bookshelves:cover-preferences") || 
                key.startsWith("bookshelves:cover-fit-mode:"))) {
      keysToClear.push(key);
    }
  }
  
  // Clear all cover preferences
  keysToClear.forEach(key => {
    window.localStorage.removeItem(key);
    console.log(`Cleared: ${key}`);
  });
  
  // Also clear the main cover preferences object
  window.localStorage.removeItem("bookshelves:cover-preferences");
  
  console.log(`Cleared ${keysToClear.length} cover preference keys`);
  console.log("Cover preferences cleared! Refresh the page to see default behavior.");
} else {
  console.log("This script must be run in a browser environment.");
}

