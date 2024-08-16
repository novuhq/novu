import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { Environment, SidebarPage } from './page-models/sidebarPage';

test.beforeEach(async ({ page }) => {
  await initializeSession(page);
});

test('should switch between development and production environment via the environment select', async ({ page }) => {
  const sidebarPage = await SidebarPage.goTo(page);
  const envSwitch = await sidebarPage.getEnvironmentSwitch();

  expect(envSwitch).toHaveValue(Environment.Development);

  await sidebarPage.toggleToProduction();
  await expect(sidebarPage.getEnvironmentSwitch()).toHaveValue(Environment.Production);

  await sidebarPage.toggleToDevelopment();
  await expect(sidebarPage.getEnvironmentSwitch()).toHaveValue(Environment.Development);
});
