import { expect } from '@playwright/test';
import { initializeSession } from './utils/browser';
import { test } from './utils/baseTest';
import { SidebarPage } from './page-models/sidebarPage';

test.describe('Main Nav (Sidebar)', () => {
  test.beforeEach(async ({ page, context }) => {
    await initializeSession(page, { noTemplates: false });
  });

  test('should render all navigation links', async ({ page }) => {
    // Check if all expected navigation links are present
    const sidebarPage = await SidebarPage.goTo(page);
    await expect(sidebarPage.getQuickStartLingLocator()).toBeVisible();
    await expect(sidebarPage.getIntegrationLinkLocator()).toBeVisible();
    await expect(sidebarPage.getSettingsLinkLocator()).toBeVisible();
    await expect(sidebarPage.getTemplatesLinkLocator()).toBeVisible();
    await expect(sidebarPage.getActivitiesLinkLocator()).toBeVisible();
    await expect(sidebarPage.getChangesLinkLocator()).toBeVisible();
    await expect(sidebarPage.getSubscribersLinkLocator()).toBeVisible();
    await expect(sidebarPage.getTenantsLinkLocator()).toBeVisible();
    await expect(sidebarPage.getTranslationsLinkLocator()).toBeVisible();
  });

  test('should navigate to correct routes when clicking links', async ({ page }) => {
    // Check if clicking on a navigation link navigates to the correct route
    const sidebarPage = await SidebarPage.goTo(page);
    await sidebarPage.getQuickStartLingLocator().click();
    expect(page.url()).toContain('/get-started');

    await sidebarPage.getIntegrationLinkLocator().click();
    expect(page.url()).toContain('/integrations');

    await sidebarPage.getSettingsLinkLocator().click();
    expect(page.url()).toContain('/settings');
  });
});
