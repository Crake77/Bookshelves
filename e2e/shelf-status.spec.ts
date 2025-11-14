import { test, expect } from "@playwright/test";

// Usage: PREVIEW_URL=https://<preview>.vercel.app npx playwright test e2e/shelf-status.spec.ts

test("changing shelf status updates immediately", async ({ page }) => {
  const url = process.env.PREVIEW_URL;
  if (!url) test.fail(true, "PREVIEW_URL env var is required");

  await page.goto(url!, { waitUntil: "networkidle" });

  // Expand the "Completed" shelf and pick the first book card
  const completedShelfToggle = page.getByTestId("shelf-completed");
  await completedShelfToggle.waitFor({ state: "visible" });
  const completedShelfContent = completedShelfToggle.locator(":scope + div");
  if (!(await completedShelfContent.isVisible())) {
    await completedShelfToggle.click();
  }
  await completedShelfContent.waitFor({ state: "visible" });

  const firstCard = completedShelfContent.locator('[data-testid^="book-card-"]').first();
  await firstCard.waitFor({ state: "visible" });
  const selectedTitle = await firstCard.locator("h3").innerText();

  await firstCard.click();

  // Update status to "Reading"
  const shelfButton = page.getByTestId("button-shelf-selector");
  await shelfButton.waitFor({ state: "visible" });
  await shelfButton.click();

  const optionReading = page.getByTestId("option-shelf-reading");
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PATCH" && res.url().includes("/api/user-books/")),
    optionReading.click(),
  ]);

  // Close dialog
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("dialog-book-detail")).toBeHidden({ timeout: 5000 });

  // Verify the "Reading" shelf now shows the same book card
  const readingShelfToggle = page.getByTestId("shelf-reading");
  await readingShelfToggle.waitFor({ state: "visible" });
  const readingShelfContent = readingShelfToggle.locator(":scope + div");
  if (!(await readingShelfContent.isVisible())) {
    await readingShelfToggle.click();
  }
  await readingShelfContent.waitFor({ state: "visible" });

  await expect(
    readingShelfContent.locator('[data-testid^="book-card-"]').filter({
      has: page.locator("h3", { hasText: selectedTitle }),
    })
  ).toBeVisible({ timeout: 5000 });

  // Verify the book no longer appears in Completed shelf
  if (!(await completedShelfContent.isVisible())) {
    await completedShelfToggle.click();
  }
  await completedShelfContent.waitFor({ state: "visible" });

  await expect(
    completedShelfContent.locator('[data-testid^="book-card-"]').filter({
      has: page.locator("h3", { hasText: selectedTitle }),
    })
  ).toHaveCount(0, { timeout: 5000 });

  // Move the same book back to Completed and verify
  const readingCard = readingShelfContent.locator('[data-testid^="book-card-"]').filter({
    has: page.locator("h3", { hasText: selectedTitle }),
  });
  await readingCard.click();

  const secondShelfButton = page.getByTestId("button-shelf-selector");
  await secondShelfButton.waitFor({ state: "visible" });
  await secondShelfButton.click();

  const optionCompleted = page.getByTestId("option-shelf-completed");
  await Promise.all([
    page.waitForResponse((res) => res.request().method() === "PATCH" && res.url().includes("/api/user-books/")),
    optionCompleted.click(),
  ]);

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("dialog-book-detail")).toBeHidden({ timeout: 5000 });

  if (!(await completedShelfContent.isVisible())) {
    await completedShelfToggle.click();
  }
  await completedShelfContent.waitFor({ state: "visible" });
  if (!(await readingShelfContent.isVisible())) {
    await readingShelfToggle.click();
  }
  await readingShelfContent.waitFor({ state: "visible" });
  const readingMatch = readingShelfContent.locator('[data-testid^="book-card-"]').filter({
    has: page.locator("h3", { hasText: selectedTitle }),
  });
  await expect(readingMatch).toHaveCount(0, { timeout: 5000 });

  const statusFromApi = await page.evaluate(async (title) => {
    const res = await fetch('/api/user-books/550e8400-e29b-41d4-a716-446655440000');
    const data = await res.json();
    const match = data.find((item: any) => item.book?.title === title);
    return match?.status ?? null;
  }, selectedTitle);
  expect(statusFromApi).toBe('completed');

  const cacheStatus = await page.evaluate((title) => {
    const client: any = (window as any).__BOOKSHELVES_QUERY_CLIENT__;
    const data = client?.getQueryData(["/api/user-books", "550e8400-e29b-41d4-a716-446655440000"]);
    const match = Array.isArray(data) ? data.find((item: any) => item.book?.title === title) : undefined;
    return match?.status ?? null;
  }, selectedTitle);
  expect(cacheStatus).toBe('completed');

  await expect(
    completedShelfContent.locator('[data-testid^="book-card-"]').filter({
      has: page.locator("h3", { hasText: selectedTitle }),
    })
  ).toBeVisible({ timeout: 5000 });
});
