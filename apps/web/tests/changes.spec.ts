import { expect, Page } from '@playwright/test';
import { test } from './utils/baseTest';
import { ChangesPage } from './page-models/changesPage';
import { SidebarPage } from './page-models/sidebarPage';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { WorkflowsPage } from './page-models/workflowsPage';

import { initializeSession } from './utils/browser';
import { SessionData } from './utils/plugins';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
});

test('should display changes to promote', async ({ page }) => {
  await createNotification(page);
  const changesPage = await ChangesPage.goTo(page);
  const tableRows = changesPage.getChangesTableRows();
  await expect(tableRows).toHaveCount(1);
});

test('fields should be disabled in Production', async ({ page }) => {
  await createNotification(page);
  await promoteNotification(page);

  const sidebarPage = await SidebarPage.goTo(page);
  await sidebarPage.toggleToProduction();

  const workflowsPage = new WorkflowsPage(page);
  await expect(workflowsPage.getCreateWorkflowButton()).toBeDisabled();
});

test('should show correct count of pending changes and update in real time', async ({ page }) => {
  await createNotification(page);
  const sidebarPage = new SidebarPage(page);
  await expect(sidebarPage.getChangesCount()).toContainText('1');

  await createNotification(page);
  await expect(sidebarPage.getChangesCount()).toContainText('2');

  await promoteNotification(page);
  await expect(sidebarPage.getChangesCount()).toContainText('1');
});

test('should show correct type and description of change', async ({ page }) => {
  await createNotification(page);
  const changesPage = await ChangesPage.goTo(page);
  await expect(changesPage.getChangeType()).toContainText('Workflow Change');
  await expect(changesPage.getChangeContent()).toContainText('Test Notification Title');
});

test('should show one change for status change and template update', async ({ page }) => {
  const template = session.templates[0];
  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  const sidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();

  await sidePanel.fillTitle('Updated Title');
  await sidePanel.closeSidePanel();
  await workflowEditorPage.submitTemplateBtn().click();

  const sidebarPage = new SidebarPage(page);
  await expect(sidebarPage.getChangesCount()).toContainText('1');

  await workflowEditorPage.openWorkflowSettingsSidePanel();
  await sidePanel.clickToggleSwitch();

  await expect(sidebarPage.getChangesCount()).toContainText('1');

  await promoteNotification(page);
  await sidebarPage.toggleToProduction();

  const workflowsPage = new WorkflowsPage(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await workflowsTable.locator('tbody tr').first().click({ force: true });

  await workflowEditorPage.openWorkflowSettingsSidePanel();
  await expect(sidePanel.getTitleLocator()).toHaveValue('Updated Title');
  await expect(sidePanel.getActiveToggleSwitch()).not.toBeChecked();
});

test('should show history of changes', async ({ page }) => {
  await createNotification(page);
  await promoteNotification(page);

  const changesPage = new ChangesPage(page);
  const tableRows = changesPage.getChangesTableRows();
  await expect(tableRows).toHaveCount(0);

  await changesPage.switchToTab('History');

  const historyRows = changesPage.getHistoryChangesTableRows();
  await expect(historyRows).toHaveCount(1);
  await expect(changesPage.getPromoteButton()).toBeDisabled();
});

test('should promote all changes with promote all btn', async ({ page }) => {
  await createNotification(page);
  await createNotification(page);

  const changesPage = await ChangesPage.goTo(page);
  const tableRows = changesPage.getChangesTableRows();
  await expect(tableRows).toHaveCount(2);

  await changesPage.getPromoteAllButton().click();
  await expect(tableRows).toHaveCount(0);
});

async function createNotification(page: Page) {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  await workflowEditorPage.setWorkflowNameInput('Test Notification Title');

  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test Notification Title',
    description: 'This is a test description for a test title',
  });
  await workflowSidePanel.closeSidePanel();

  const emailModalPage = await workflowEditorPage.addAndEditEmailNode();
  await emailModalPage.fillEmailSubject('this is email subject');
  await emailModalPage.closeSidePanel();
  await emailModalPage.getNotificationTemplateSubmitButton().click();
}

async function promoteNotification(page: Page) {
  const changesPage = await ChangesPage.goTo(page);
  await changesPage.getPromoteButton().click();
}
