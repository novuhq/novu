import { test } from './utils/baseTest';
import { SubscribersPage } from './page-models/subscribers';
import { initializeSession } from './utils/browser';

test.beforeEach(async ({ page }) => {
  await initializeSession(page);
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
