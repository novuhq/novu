import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';
import { Environment, SidebarPage } from './page-models/sidebarPage';
import { getAuthToken } from './utils.ts/authUtils';
import { FeatureFlagsMock } from './utils.ts/featureFlagsMock';
import { SessionData } from './utils.ts/plugins';

let featureFlagsMock: FeatureFlagsMock, session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ featureFlagsMock, session } = await initializeSession(page));
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
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
