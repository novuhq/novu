import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { SidebarPage } from './page-models/sidebarPage';
import { addOrganization, SessionData } from './utils/plugins';
import { getAuthToken } from './utils/authUtils';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
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
