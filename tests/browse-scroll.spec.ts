import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test('debug - check what carousels exist', async ({ page }) => {
  await page.goto(`${BASE_URL}/browse`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/browse-page-debug.png', fullPage: true });
  
  const bodyText = await page.locator('body').textContent();
  console.log('Page text:', bodyText?.substring(0, 500));
  
  const allSections = await page.locator('section[data-testid^="section-"]').all();
  console.log(`Found ${allSections.length} sections`);
  
  for (const section of allSections) {
    const testId = await section.getAttribute('data-testid');
    console.log(`  - ${testId}`);
  }
});

test('browse page carousels should load more books on scroll', async ({ page }) => {
  await page.goto(`${BASE_URL}/browse`);
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Find the Fiction carousel
  const fictionCarousel = page.locator('[data-testid="section-fiction"]');
  await expect(fictionCarousel).toBeVisible();
  
  // Get initial book count
  const scrollContainer = fictionCarousel.locator('.overflow-x-auto').first();
  const initialBooks = await scrollContainer.locator('[data-testid^="book-card-"]').count();
  
  console.log(`Initial books in Fiction carousel: ${initialBooks}`);
  
  // Scroll to the end of the carousel
  await scrollContainer.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  
  // Wait a bit for the load to trigger
  await page.waitForTimeout(1000);
  
  // Check if more books loaded
  const finalBooks = await scrollContainer.locator('[data-testid^="book-card-"]').count();
  
  console.log(`Final books in Fiction carousel: ${finalBooks}`);
  
  expect(finalBooks).toBeGreaterThan(initialBooks);
});

test('browse page Romance carousel should load more books on scroll', async ({ page }) => {
  await page.goto(`${BASE_URL}/browse`);
  
  await page.waitForLoadState('networkidle');
  
  const romanceCarousel = page.locator('[data-testid="section-romance"]');
  await expect(romanceCarousel).toBeVisible();
  
  const scrollContainer = romanceCarousel.locator('.overflow-x-auto').first();
  const initialBooks = await scrollContainer.locator('[data-testid^="book-card-"]').count();
  
  console.log(`Initial books in Romance carousel: ${initialBooks}`);
  
  await scrollContainer.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  
  await page.waitForTimeout(1000);
  
  const finalBooks = await scrollContainer.locator('[data-testid^="book-card-"]').count();
  
  console.log(`Final books in Romance carousel: ${finalBooks}`);
  
  expect(finalBooks).toBeGreaterThan(initialBooks);
});
