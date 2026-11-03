import { expect, test } from '@playwright/test';

const PRODUCT_HUNT_URL = 'https://www.producthunt.com/products/agent-inbox?utm_source=other&utm_medium=social';

for (const path of ['/', '/sapien']) {
  test(`product hunt banner on ${path} links to the launch`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    const banner = page.getByRole('complementary', { name: 'Product Hunt' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('We are on Product Hunt today.');
    const link = banner.getByRole('link', { name: 'Support us' });
    await expect(link).toHaveAttribute('href', PRODUCT_HUNT_URL);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`product hunt banner stays on screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ['/', '/sapien']) {
      await page.goto(path);
      const box = await page.getByRole('complementary', { name: 'Product Hunt' }).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
  });
}
