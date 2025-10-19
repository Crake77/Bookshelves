import { test, expect, devices } from "@playwright/test";

// Ensures the Book Detail dialog opens and the rating sheet is accessible on a mobile viewport
test("mobile dialog opens and score sheet shows", async ({ browser }) => {
  const url = process.env.PREVIEW_URL;
  if (!url) test.fail(true, "PREVIEW_URL env var is required");

  const context = await browser.newContext({ ...devices["iPhone 12"] });
  const page = await context.newPage();
  await page.goto(url!, { waitUntil: "networkidle" });

  // Expand Completed shelf
  const completedShelfToggle = page.getByTestId("shelf-completed");
  await completedShelfToggle.waitFor({ state: "visible" });
  const completedShelfContent = completedShelfToggle.locator(":scope + div");
  if (!(await completedShelfContent.isVisible())) {
    await completedShelfToggle.click();
  }
  await completedShelfContent.waitFor({ state: "visible" });

  // Open first book dialog
  const firstCard = completedShelfContent.locator('[data-testid^="book-card-"]').first();
  await firstCard.click();
  const dialog = page.getByTestId("dialog-book-detail");
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Open score sheet and assert number pad visible
  await page.getByTestId("button-rating-trigger").click();
  await expect(page.getByTestId("button-numpad-1")).toBeVisible({ timeout: 5000 });

  await context.close();
});

