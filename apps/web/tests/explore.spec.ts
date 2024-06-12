import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';

test.beforeEach(async ({ page }) => {
  const { featureFlagsMock } = await initializeSession(page);
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test('auth user navigating to root gets directed to workflows', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('/workflows**');
});
