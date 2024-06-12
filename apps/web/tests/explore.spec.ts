import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';

test.beforeEach(async ({ page }) => {
  await initializeSession(page);
});

test('auth user navigating to root gets directed to workflows', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('/workflows**');
});
