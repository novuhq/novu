import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { SidebarPage } from './page-models/sidebarPage';
import { addOrganization, SessionData } from './utils/plugins';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
});

test('should display organization select with the current organization', async ({ page }) => {
  const sidebarPage = await SidebarPage.goTo(page);
  await expect(sidebarPage.getOrganizationSwitch()).toHaveValue(new RegExp(session.organization.name, 'i'));
});

test('should use a different jwt token after switching organization', async ({ page }) => {
  const originToken = session.token;
  const newOrg = await addOrganization(session.user._id);

  await page.reload();

  const sidebarPage = await SidebarPage.goTo(page);
  const orgSwitch = await sidebarPage.getOrganizationSwitch();
  await orgSwitch.scrollIntoViewIfNeeded();
  await orgSwitch.focus();

  const responsePromise = page.waitForResponse('**/auth/organizations/**/switch');
  const selectItem = orgSwitch.page().getByRole('option', { name: newOrg.name });
  await selectItem.click({ force: true });
  await responsePromise;

  const newToken = await page.evaluate(() => localStorage.getItem('nv_auth_token'));
  expect(newToken).not.toBe(originToken);
});
