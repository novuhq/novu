import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';
import { SidebarPage } from './page-models/sidebarPage';
import { addOrganization, SessionData } from './utils.ts/plugins';
import { getAuthToken } from './utils.ts/authUtils';
import { FeatureFlagsMock } from './utils.ts/featureFlagsMock';

let featureFlagsMock: FeatureFlagsMock, session: SessionData;
test.beforeEach(async ({ context, page }) => {
  ({ featureFlagsMock, session } = await initializeSession(page));
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test('should display switch when page is loaded', async ({ page }) => {
  const sidebarPage = await SidebarPage.goTo(page);
  const orgSwitch = sidebarPage.getOrganizationSwitch();
  await expect(orgSwitch).toBeVisible();
  const orgName = await orgSwitch.getAttribute('value');
  expect(orgName?.toLowerCase()).toEqual(session.organization.name.toLowerCase());
});

test('should use different jwt token after switches', async ({ page }) => {
  const originToken = session.token;
  const newOrg = await addOrganization(session.user._id);

  const sidebarPage = await SidebarPage.goTo(page);
  const orgSwitch = sidebarPage.getOrganizationSwitch();
  await orgSwitch.scrollIntoViewIfNeeded();
  await orgSwitch.focus();

  const selectItem = orgSwitch.page().getByRole('option', { name: newOrg.name });
  const responsePromise = page.waitForResponse('**/auth/organizations/**/switch');
  await selectItem.click({ force: true });
  await responsePromise;

  const newToken = await getAuthToken(page);
  expect(newToken).not.toBe(originToken);
});
