import { test, expect, devices } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL;

test.describe("Book detail taxonomy chips", () => {
  test.beforeAll(() => {
    if (!PREVIEW_URL) {
      test.fail(true, "PREVIEW_URL env var is required");
    }
  });

  test("clickable chips open filtered dialog", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["Desktop Chrome"] });
    const page = await context.newPage();
    await page.goto(PREVIEW_URL!, { waitUntil: "networkidle" });

    const firstCard = page.locator('[data-testid^="book-card-"]').first();
    await firstCard.waitFor({ state: "visible", timeout: 10_000 });
    await firstCard.click();

    const detailDialog = page.getByTestId("dialog-book-detail");
    await expect(detailDialog).toBeVisible({ timeout: 5_000 });
    await detailDialog.waitFor({ state: "visible" });

    const taxonomySection = detailDialog.getByTestId("taxonomy-chips");
    await taxonomySection.waitFor({ state: "visible" });

    const dialogHeader = page.getByTestId("taxonomy-dialog-header");

    async function openAndAssert(locator: Parameters<typeof detailDialog.locator>[0], expectation: string) {
      const chip = detailDialog.locator(locator);
      if (await chip.count() === 0) {
        test.skip(`No ${expectation} chip available on the sample book.`);
      }
      await chip.first().click();
      await expect(dialogHeader).toBeVisible({ timeout: 5_000 });
      const results = page.locator('[data-testid^="taxonomy-book-"]');
      const emptyMessage = page.locator("text=No books match this filter yet.");
      const firstResult = results.first();
      const hasResult = await firstResult
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (hasResult) {
        await expect(firstResult).toBeVisible();
      } else {
        await expect(emptyMessage).toBeVisible({ timeout: 3_000 });
      }
      await page.keyboard.press("Escape");
      await expect(dialogHeader).toBeHidden({ timeout: 3_000 });
    }

    await openAndAssert('[data-testid^="chip-tag-"]', "tag");
    await openAndAssert('[data-testid="chip-format"]', "format");
    await openAndAssert('[data-testid="chip-audience"]', "audience");
    await openAndAssert('[data-testid="text-book-author"] .cursor-pointer', "author");

    await context.close();
  });
});
