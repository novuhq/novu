import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { Environment, SidebarPage } from './page-models/sidebarPage';
import { getAuthToken } from './utils/authUtils';
import { SessionData } from './utils/plugins';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
});

test('should display switch when page is loaded', async ({ page }) => {
  const sidebarPage = await SidebarPage.goTo(page);
  const envSwitch = sidebarPage.getEnvironmentSwitch();

  await expect(envSwitch).toBeVisible();
  await envSwitch.click();

  await expect(envSwitch.page().getByRole('option', { name: Environment.Development })).toBeVisible();
  await expect(envSwitch.page().getByRole('option', { name: Environment.Production })).toBeVisible();
});

test('should use different jwt token after switches', async ({ page }) => {
  const originToken = session.token;
  const sidebarPage = await SidebarPage.goTo(page);
  await sidebarPage.toggleToProduction();

  const newToken = await getAuthToken(page);
  expect(newToken).not.toBe(originToken);
});
