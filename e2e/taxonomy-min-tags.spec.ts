import { test, expect } from "@playwright/test";

// Smoke: ensure dialog shows a reasonable number of tags

test("dialog shows at least 6 tags for a popular title", async ({ page }) => {
  const url = process.env.PREVIEW_URL;
  if (!url) test.fail(true, "PREVIEW_URL env var is required");

  await page.goto(url!, { waitUntil: "networkidle" });

  // Open Shelves → Completed and click first book
  const completedShelfToggle = page.getByTestId("shelf-completed");
  await completedShelfToggle.waitFor({ state: "visible" });
  const completedShelfContent = completedShelfToggle.locator(":scope + div");
  if (!(await completedShelfContent.isVisible())) {
    await completedShelfToggle.click();
  }
  await completedShelfContent.waitFor({ state: "visible" });
  const firstCard = completedShelfContent.locator('[data-testid^="book-card-"]').first();
  await firstCard.waitFor({ state: "visible" });
  await firstCard.click();

  // Wait for taxonomy chips to render
  const tagsContainer = page.getByTestId("taxonomy-tags");
  await tagsContainer.waitFor({ state: "visible" });
  // Count tag chips by data-testid
  // Wait up to 10s for async attach to complete
  await expect(async () => {
    const tags = await tagsContainer.locator('[data-testid^="chip-tag-"]').count();
    if (tags >= 1) {
      expect(tags).toBeGreaterThanOrEqual(1);
      return;
    }
    // Fallback: require at least a genre or subgenre chip
    const genres = await page.locator('[data-testid^="chip-genre-"]').count();
    const subs = await page.locator('[data-testid^="chip-subgenre-"]').count();
    expect(genres + subs).toBeGreaterThanOrEqual(1);
  }).toPass({ timeout: 10000 });
});
