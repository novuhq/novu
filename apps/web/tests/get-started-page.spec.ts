import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { GetStartedPage, Tab } from './page-models/getStartedPage';

test.beforeEach(async ({ context, page }) => {
  await initializeSession(page, { noTemplates: true });
});

test.skip('GetStartedPage', () => {
  test('should display get started page', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.assertGetStartedPageIsVisible();
  });

  test('should have all Tab and default to in-app', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.assertTabsAreVisible(Object.values(Tab));
    await getStartedPage.assertTabSelected(Tab.IN_APP);
  });

  test('should load the page with a specific tab selected when the appropriate URL search param is passed', async ({
    page,
  }) => {
    const queryParams = '?tab=multi-channel';
    const getStartedPage = await GetStartedPage.goTo(page, queryParams);
    await getStartedPage.assertTabSelected(Tab.MULTI_CHANNEL);
  });

  test('should navigate to the In-app tab, and have the correct content', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.verifyTabContent(Tab.IN_APP);
  });

  test('should navigate to the Multi-channel tab, and have the correct content', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.verifyTabContent(Tab.MULTI_CHANNEL);
  });

  test('should navigate to the Digest tab, and have the correct content', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.verifyTabContent(Tab.DIGEST);
  });

  test('should navigate to the Delay tab, and have the correct content', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.verifyTabContent(Tab.DELAY);
  });

  test('should navigate to the Translate tab, and have the correct content', async ({ page }) => {
    const getStartedPage = await GetStartedPage.goTo(page);
    await getStartedPage.verifyTabContent(Tab.TRANSLATE);
  });
});
