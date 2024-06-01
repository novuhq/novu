import { test } from './utils.ts/baseTest';
import { assertPageShowsMessage, initializeSession } from './utils.ts/browser';
import { TranslationsPage } from './page-models/translationsPage';
import path from 'path';

test.beforeEach(async ({ page }) => {
  const { featureFlagsMock } = await initializeSession(page, { noTemplates: true });
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test('Can create translation group', async ({ page }) => {
  const groupName = 'My Test Group';
  const translationsPage = await TranslationsPage.goTo(page);
  await translationsPage.assertTitleEquals('Translations');
  await translationsPage.createGroup(groupName);
  await translationsPage.assertHasHeading(groupName);
});

test('Can delete a translation group', async ({ page }) => {
  const translationsPage = await TranslationsPage.goTo(page);
  const { identifier } = await translationsPage.createGroup();
  await translationsPage.navigateToGroup(identifier);
  await page.getByTestId('delete-group-btn').click();
  await page.getByTestId('delete-group-submit-btn').click();
  await translationsPage.assertGroupDoesNotExist(identifier);
});

test('Can upload translation file', async ({ page }) => {
  const translationsPage = await TranslationsPage.goTo(page);
  const { identifier } = await translationsPage.createGroup();
  await translationsPage.navigateToGroup(identifier);
  await translationsPage.uploadTranslationFile(path.join(__dirname, 'fixtures/translation.json'));
  await assertPageShowsMessage(page, 'translation.json');
});
