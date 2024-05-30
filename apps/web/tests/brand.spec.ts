import { test } from './utils.ts/baseTest';
import { BrandPage } from './page-models/brandPage';
import { assertPageShowsMessage, initializeSession } from './utils.ts/browser';

let session;
test.beforeEach(async ({ page }) => {
  const { featureFlagsMock, session: newSession } = await initializeSession(page);
  session = newSession;
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_BILLING_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test.skip('TODO - updates logo', async ({ page }) => {
  const brandPage = await BrandPage.goTo(page);
  await brandPage.uploadLogoImage('../fixtures/test-logo.png');
  await brandPage.assertImageSourceSetCorrectly(session.organization._id);
});

test.skip('TODO: - changes the color settings', async ({ page }) => {
  // NV-3793: browser freezes when clicking on the color picker
  const colorChoice = '#BA68C8';
  const brandPage = await BrandPage.goTo(page);
  await brandPage.choosesColorViaButton(colorChoice);
  await brandPage.submitBrandSettings();
  await page.reload();
  await assertPageShowsMessage(page, colorChoice);
  await brandPage.assertInputHasValue('color-picker', colorChoice);
});

test('changes the font settings', async ({ page }) => {
  const brandPage = await BrandPage.goTo(page);
  await brandPage.choosesFontViaDropdown('Fira Code');
  await brandPage.submitBrandSettings();
  await assertPageShowsMessage(page, 'Branding info updated successfully');
  await page.reload();
  await brandPage.assertInputHasValue('font-family-selector', 'Fira Code');
});
