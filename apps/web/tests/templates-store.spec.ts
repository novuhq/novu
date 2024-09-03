import { expect } from '@playwright/test';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { test } from './utils/baseTest';
import { WorkflowsPage } from './page-models/workflowsPage';
import { initializeSession, setFeatureFlag } from './utils/browser';
import { populateBlueprints } from './utils/plugins';

test.beforeAll(async () => {
  await populateBlueprints();
});

test.beforeEach(async ({ page }) => {
  await setFeatureFlag(page, FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED, true);
  await initializeSession(page, { noTemplates: true });
});

test.skip('shows templates and creates a new workflow on template selection', async ({ page }) => {
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
