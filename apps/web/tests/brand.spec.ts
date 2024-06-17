import { test } from './utils/baseTest';
import { BrandPage } from './page-models/brandPage';
import { assertPageShowsMessage, initializeSession } from './utils/browser';

let session;
test.beforeEach(async ({ page }) => {
  const { session: newSession } = await initializeSession(page);
  session = newSession;
});

test.skip('updates logo', async ({ page }) => {
  const brandPage = await BrandPage.goTo(page);
  await brandPage.uploadLogoImage('../fixtures/test-logo.png');
  await brandPage.assertImageSourceSetCorrectly(session.organization._id);
});

test.skip('changes the color settings', async ({ page }) => {
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
