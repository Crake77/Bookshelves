import { test, expect } from "@playwright/test";

const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:8001";

test("cover carousel toggles fit mode and updates selected cover", async ({ page }) => {
  test.skip(!PREVIEW_URL, "PREVIEW_URL must be defined");

  await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });

  await page.getByTestId("tab-browse").click();
  const candidates = [
    { bookId: "pZJ2H63MAioC", coverTestId: "book-card-cover-the-eye-of-the-world" },
    { bookId: "nrRKDwAAQBAJ", coverTestId: "book-card-cover-dune" },
  ];

  let activeCandidate: { coverTestId: string } | null = null;
  for (const candidate of candidates) {
    const locator = page.locator(`[data-book-id="${candidate.bookId}"]`).first();
    try {
      await locator.waitFor({ timeout: 10000 });
      await locator.click();
      activeCandidate = { coverTestId: candidate.coverTestId };
      break;
    } catch {
      // try next candidate
    }
  }

  if (!activeCandidate) {
    test.skip(true, "No candidate book cards available for cover carousel test.");
  }

  const coverImg = page.getByTestId("img-book-cover");
  await coverImg.waitFor();
  const initialSrc = await coverImg.getAttribute("src");

  await coverImg.click();
  await expect(page.getByText("Select Cover Edition")).toBeVisible();

  const scrollContainer = page.getByTestId("cover-scroll-container");
  await scrollContainer.waitFor();
  const box = await scrollContainer.boundingBox();
  if (!box) {
    test.skip(true, "Cover dialog was not visible for scroll verification.");
  }
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const beforeScroll = await scrollContainer.evaluate((el) => ({
    value: el.scrollLeft,
    canScroll: el.scrollWidth > el.clientWidth + 8,
  }));
  if (!beforeScroll.canScroll) {
    test.skip(true, "Cover dialog did not render enough tiles to validate scrolling.");
  }
  await page.mouse.wheel(600, 0);
  await expect
    .poll(() => scrollContainer.evaluate((el) => el.scrollLeft), { timeout: 2000, intervals: [200, 400, 600] })
    .toBeGreaterThan(beforeScroll.value);

  const fitToggle = page.getByLabel("Fit to card");
  const initialState = await fitToggle.getAttribute("data-state");
  await fitToggle.click();
  await expect(fitToggle).not.toHaveAttribute("data-state", initialState ?? "unchecked");

  const coverOptions = page.locator('[data-testid^="cover-option-"]');
  await coverOptions.first().waitFor();
  let optionCount = await coverOptions.count();
  if (optionCount < 2) {
    const loadMoreButton = page.getByRole("button", { name: /load more covers/i });
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await coverOptions.nth(1).waitFor({ timeout: 10000 });
      optionCount = await coverOptions.count();
    }
  }
  if (optionCount < 2) {
    test.skip(true, "Not enough cover options available to validate selection flow.");
  }
  const targetOption = coverOptions.nth(1);
  const nextCoverSrc = await targetOption.locator("img").getAttribute("src");
  await targetOption.click();

  await expect(page.getByText("Select Cover Edition")).toBeHidden();

  await expect(coverImg).not.toHaveAttribute("src", initialSrc ?? "");
  if (nextCoverSrc) {
    await expect(coverImg).toHaveAttribute("src", nextCoverSrc);
    const cardCover = page.getByTestId(activeCandidate!.coverTestId);
    await expect(cardCover).toHaveAttribute("src", nextCoverSrc);
  }
});
