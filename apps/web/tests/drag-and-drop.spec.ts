import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession, waitForNetworkIdle } from './utils/browser';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { ChannelType } from './utils/ChannelType';

test.beforeEach(async ({ page }) => {
  await initializeSession(page);
});

test('should drag and drop channel', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test drag and drop channel',
  });
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.addChannelToWorkflow(ChannelType.IN_APP);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP, true);
});

test('should add a step with plus button', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test Plus Button',
  });
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.buttonAdd().click();
  await workflowEditorPage.addSmsNode().click();
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(2 + 1); // + drag&drop placeholder
  await expect(workflowEditorPage.getAllNodes().first()).toContainText('Workflow trigger');
  await expect(workflowEditorPage.getAllNodes().nth(1)).toContainText('SMS');
});
