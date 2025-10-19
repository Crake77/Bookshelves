import { test, expect } from "@playwright/test";

// Usage: PREVIEW_URL=https://<preview>.vercel.app npx playwright test e2e/taxonomy-populate.spec.ts

async function openFirstBookFromCompleted(page: any) {
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
}

test("taxonomy chips populate in book dialog from shelves, browse, and nested dialog", async ({ page }) => {
  const url = process.env.PREVIEW_URL;
  if (!url) test.fail(true, "PREVIEW_URL env var is required");

  await page.goto(url!, { waitUntil: "networkidle" });

  // 1) From Shelves
  await openFirstBookFromCompleted(page);
  await expect(page.getByTestId("taxonomy-chips")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("dialog-book-detail")).toBeHidden({ timeout: 5000 });

  // 2) From Browse (Most Popular)
  await page.getByTestId("tab-browse").click();
  const popularSection = page.getByTestId("section-most-popular");
  await popularSection.waitFor({ state: "visible" });
  const firstBrowseCard = popularSection.locator('[data-testid^="book-card-"]').first();
  await firstBrowseCard.waitFor({ state: "visible" });
  await firstBrowseCard.click();
  await expect(page.getByTestId("taxonomy-chips")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("dialog-book-detail")).toBeHidden({ timeout: 5000 });

  // 3) Nested: open a book, click a tag, then open a book from the tag dialog
  await page.getByTestId("tab-shelves").click();
  await openFirstBookFromCompleted(page);
  const chips = page.getByTestId("taxonomy-chips");
  await expect(chips).toBeVisible({ timeout: 15000 });
  // Click the first tag badge (text begins with '#')
  const firstTag = chips.locator("text=/^#./").first();
  await firstTag.click();
  await expect(page.getByTestId("taxonomy-dialog-header")).toBeVisible({ timeout: 10000 });
  const firstTaxonomyCard = page.locator('[data-testid^="taxonomy-book-"]').first();
  await firstTaxonomyCard.click();
  await expect(page.getByTestId("taxonomy-chips")).toBeVisible({ timeout: 15000 });
  // Close nested and parent dialogs (use Escape to avoid overlay intercepts)
  await page.keyboard.press('Escape');
  // Ensure parent taxonomy dialog is closed too
  await page.keyboard.press('Escape');
});
