import { test } from './utils/baseTest';
import { LayoutsPage } from './page-models/layoutsPage';
import { initializeSession } from './utils/browser';

test.beforeEach(async ({ page }) => {
  await initializeSession(page);
});

test('should display layouts list', async ({ page }) => {
  const subscribersPage = await LayoutsPage.goTo(page);
  await subscribersPage.assertIsVisible();
  // The last empty string is for the action column and doesn't have a header
  await subscribersPage.assertLayoutsTableHeaders(['Name', 'Description', 'Created At', 'Last Updated', '']);
  await subscribersPage.assertLayoutsTableRowCount(1);
});
