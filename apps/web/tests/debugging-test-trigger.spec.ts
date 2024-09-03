import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { initializeSession } from './utils/browser';
import { SessionData } from './utils/plugins';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
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
