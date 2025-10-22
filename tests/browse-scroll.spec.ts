import { test, expect } from '@playwright/test';

test('browse page carousels should load more books on scroll', async ({ page }) => {
  await page.goto('http://localhost:5173/browse');
  
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
  await page.goto('http://localhost:5173/browse');
  
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
