import { expect, Page } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { WorkflowsPage } from './page-models/workflowsPage';
import { deleteIndexedDB, initializeSession } from './utils.ts/browser';
import { populateBlueprints } from './utils.ts/plugins';

test.beforeAll(async () => {
  await populateBlueprints();
});

test.beforeEach(async ({ page }) => {
  const { featureFlagsMock } = await initializeSession(page, { noTemplates: true });
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_TEMPLATE_STORE_ENABLED: true,
  });
});

test('shows templates and creates a new workflow on template selection', async ({ page }) => {
  const workflowsPage = await WorkflowsPage.goTo(page);
  await expect(workflowsPage.getNoWorkflowsPlaceholder()).toBeVisible();
  await expect(workflowsPage.getCreateWorkflowTile()).toBeVisible();
  await expect(workflowsPage.getAllWorkflowTile()).toBeVisible();

  await expect(workflowsPage.getCreateWorkflowDropdown()).toBeVisible();
  await workflowsPage.getCreateWorkflowDropdown().click();
  await expect(workflowsPage.getCreateWorkflowButton()).toBeVisible();
  await expect(workflowsPage.getCreateAllTemplatesWorkflowButton()).toBeVisible();

  const createTemplateItem = workflowsPage.getCreateTemplateDropdownItem().nth(0);
  await createTemplateItem.click();

  await page.waitForURL('/workflows/edit/*');
});
