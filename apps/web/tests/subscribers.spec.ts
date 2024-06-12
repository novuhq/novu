import { test } from './utils.ts/baseTest';
import { SubscribersPage } from './page-models/subscribers';
import { initializeSession } from './utils.ts/browser';

test.beforeEach(async ({ page }) => {
  const { featureFlagsMock } = await initializeSession(page);
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: true,
  });
});

test('should display subscribers list', async ({ page }) => {
  const subscribersPage = await SubscribersPage.goTo(page);
  await subscribersPage.assertSubscribersPageIsVisible();
  await subscribersPage.assertSubscribersTableHeaders([
    'Subscriber identifier',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Created At',
    'Data',
  ]);
  await subscribersPage.assertSubscribersTableRowCount(1);
});
