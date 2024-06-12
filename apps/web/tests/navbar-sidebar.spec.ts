import { initializeSession } from './utils.ts/browser';
import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { SidebarPage } from './page-models/sidebarPage';

test.describe('Main Nav (Sidebar)', () => {
  test.describe('Information Architecture enabled', () => {
    test.beforeEach(async ({ page, context }) => {
      const { featureFlagsMock } = await initializeSession(page, { noTemplates: false });
      featureFlagsMock.setFlagsToMock({
        IS_IMPROVED_ONBOARDING_ENABLED: false,
        IS_INFORMATION_ARCHITECTURE_ENABLED: true,
        IS_TEMPLATE_STORE_ENABLED: false,
      });
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
});
