import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { initializeSession } from './utils.ts/browser';
import { SessionData } from './utils.ts/plugins';
import { FeatureFlagsMock } from './utils.ts/featureFlagsMock';

let featureFlagsMock: FeatureFlagsMock, session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ featureFlagsMock, session } = await initializeSession(page));
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test('should open test trigger modal', async ({ page }) => {
  const template = session.templates[0];
  const userId = session.user._id;

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  const workflowTriggerSidebar = await workflowEditorPage.openWorkflowTriggerSidebar();

  await expect(workflowTriggerSidebar.locator()).toBeVisible();
  await expect(workflowTriggerSidebar.getTestTriggerToParam()).toContainText(`"subscriberId": "${userId}"`);
});

test('should not test trigger on error', async ({ page }) => {
  const template = session.templates[0];
  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  const workflowTriggerSidebar = await workflowEditorPage.openWorkflowTriggerSidebar();

  await expect(workflowTriggerSidebar.locator()).toBeVisible();
  await workflowTriggerSidebar.getTestTriggerToParam().fill('Backspace');
  await workflowTriggerSidebar.getTestTriggerPayloadParam().click();
  await expect(workflowTriggerSidebar.getTestTriggerBtn()).toBeDisabled();
  await expect(workflowTriggerSidebar.locator()).toBeVisible();
  await expect(workflowTriggerSidebar.getTestTriggerToParam()).toHaveClass(/mantine-JsonInput-invalid/);
});
