import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { ChannelType } from './utils/ChannelType';
import { NodeInAppEditingModalPageModel } from './page-models/nodeInAppEditingModalPageModel';
import { NodeDigestEditorPageModal } from './page-models/nodeDigestEditorPageModal';
import { NodeEmailEditorPageModal } from './page-models/nodeEmailEditorPageModal';
import { SessionData } from './utils/plugins';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
});

test('should be able to delete a step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(4);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  await inAppModalPage.getStepActionsMenuButtonLocator().click();
  await inAppModalPage.getDeleteStepActionLocator().click();
  await page.getByRole('button', { name: 'Delete step' }).click();

  await expect(workflowEditorPage.getNode(ChannelType.IN_APP, 0)).not.toBeVisible();
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(3);
  await expect(workflowEditorPage.getAllNodes().nth(1)).toContainText('Email');

  await workflowEditorPage.submitTemplateBtn().click();
  await page.goto(`/workflows/edit/${template._id}`);
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(3);
});

test('should show add step in sidebar after delete', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(4);

  await workflowEditorPage.getNode(ChannelType.IN_APP, 0).hover();
  await workflowEditorPage.getStepActionsMenuButtonLocator().click();
  await workflowEditorPage.getDeleteStepActionLocator().click();
  await page.getByRole('button', { name: 'Delete step' }).click();

  await expect(workflowEditorPage.getNode(ChannelType.IN_APP, 0)).not.toBeVisible();
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(3);
  await expect(workflowEditorPage.getDragSideMenu()).toContainText('Channels');
});

test('should show add step in sidebar after a delete of a step with side settings ', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.addChannelToWorkflow(ChannelType.DIGEST);
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(5);

  await workflowEditorPage.clickWorkflowNode(ChannelType.DIGEST);
  const digestModalPage = new NodeDigestEditorPageModal(page);
  await digestModalPage.getDeleteButton().click();
  await page.getByRole('button', { name: 'Delete step' }).click();

  await expect(workflowEditorPage.getNode(ChannelType.DIGEST, 0)).not.toBeVisible();
  await expect(workflowEditorPage.getAllNodes()).toHaveCount(4);
  await expect(workflowEditorPage.getDragSideMenu()).toContainText('Channels');
});

test('should keep steps order on reload', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  const smsModalPage = await workflowEditorPage.addAndEditInSmsNode();
  await smsModalPage.fillSmsBody('new content for sms');
  await smsModalPage.nodeSettingsUpdateButton().click();

  await page.goto(`/workflows/edit/${template._id}`);

  await expect(workflowEditorPage.getAllNodes()).toHaveCount(5);
  await expect(workflowEditorPage.getAllNodes().nth(0)).toContainText('Workflow trigger');
  await expect(workflowEditorPage.getAllNodes().nth(1)).toContainText('In-App');
  await expect(workflowEditorPage.getAllNodes().nth(2)).toContainText('Email');
  await expect(workflowEditorPage.getAllNodes().nth(3)).toContainText('SMS');
});

test('should be able to disable step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();
  const inAppModalPage = new NodeInAppEditingModalPageModel(page);

  await expect(inAppModalPage.getStepActiveSwitch().locator('input')).toBeChecked();
  await inAppModalPage.getStepActiveSwitch().click({ force: true });
  await inAppModalPage.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();
  await expect(inAppModalPage.getStepActiveSwitch().locator('input')).not.toBeChecked();
});

test('should be able to toggle ShouldStopOnFailSwitch', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();
  const inAppModalPage = new NodeInAppEditingModalPageModel(page);

  await expect(inAppModalPage.getStepShouldStopOnFailSwitch()).toContainText('Stop if step fails');
  await inAppModalPage.getStepShouldStopOnFailSwitch().click({ force: true });
  await inAppModalPage.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();
  await expect(inAppModalPage.getStepShouldStopOnFailSwitch().locator('input')).toBeChecked();
});

test('should be able to add filters to a digest step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  const digestModalPage = await workflowEditorPage.addAndEditDigestNode();
  const conditionsPage = await digestModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewSubscriberCondition('filter-key', 'Equal', 'filter-value');

  await expect(digestModalPage.getEditorSidebarEditConditionsButton()).toHaveText('1');
  await digestModalPage.nodeSettingsUpdateButton().click();
  await page.goto(`/workflows/edit/${template._id}`);
  await workflowEditorPage.clickWorkflowNode(ChannelType.DIGEST);
  await expect(digestModalPage.getEditorSidebarEditConditionsButton()).toContainText('1');
});

test('should be able to add filters to a delay step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  const delayModalPage = await workflowEditorPage.addAndEditDelayNode();
  const conditionsPage = await delayModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewSubscriberCondition('filter-key', 'Equal', 'filter-value');

  await expect(delayModalPage.getEditorSidebarEditConditionsButton()).toHaveText('1');
  await delayModalPage.nodeSettingsUpdateButton().click();
  await page.goto(`/workflows/edit/${template._id}`);
  await workflowEditorPage.clickWorkflowNode(ChannelType.DELAY);
  await expect(delayModalPage.getEditorSidebarEditConditionsButton()).toContainText('1');
});

test('should be able to add filters to a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewSubscriberCondition('filter-key', 'Equal', 'filter-value');

  await expect(inAppModalPage.getAddConditionsAction()).toHaveText('1');
});

test('should be able to add read/seen filters to a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.EMAIL);

  const emailModalPage = new NodeEmailEditorPageModal(page);
  const conditionsPage = await emailModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewPreviousStepCondition('In-App', 'Seen');

  await expect(emailModalPage.getAddConditionsAction()).toHaveText('1');
});

test('should be able to not add read/seen filters to first step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.getAddNewConditionButton().click();
  await conditionsPage.getConditionsFormOnDropdown().click();
  await expect(page.getByRole('option', { name: 'Previous step' })).not.toBeVisible();
});

test('should be able to remove filters for a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewSubscriberCondition('filter-key', 'Equal', 'filter-value');
  await expect(inAppModalPage.getAddConditionsAction()).toHaveText('1');

  await inAppModalPage.getAddConditionsAction().click();
  await conditionsPage.getConditionsRowButton().click();
  await conditionsPage.getConditionsRowDeleteButton().click();
  await conditionsPage.getApplyConditionsButton().click();
  await expect(inAppModalPage.getAddConditionsAction()).not.toHaveText('1');
});

test('should be able to add webhook filter for a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewWebhookCondition('www.example.com', 'filter-key', 'Equal', 'filter-value');
  await expect(inAppModalPage.getAddConditionsAction()).toHaveText('1');
});

test('should be able to add online right now filter for a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.addOnlineNowCondition(true);
  await expect(inAppModalPage.getAddConditionsAction()).toHaveText('1');
});

test('should be able to add online in the last X time period filter for a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.addLastTimeOnlineCondition('Hours', '1');
  await expect(inAppModalPage.getAddConditionsAction()).toHaveText('1');
});

test('should be able to add multiple filters to a particular step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  const workflowEditorPage = new WorkflowEditorPage(page);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);

  const inAppModalPage = new NodeInAppEditingModalPageModel(page);
  const conditionsPage = await inAppModalPage.openAddConditionsSidebar();
  await conditionsPage.addNewSubscriberCondition('filter-key', 'Equal', 'filter-value');
  await inAppModalPage.getAddConditionsAction().click();
  await conditionsPage.addOnlineNowCondition(true);
  await expect(inAppModalPage.getAddConditionsAction()).toHaveText('2');
});

test.skip('should re-render content on between step click', async ({ page }) => {
  await page.goto('/workflows/create');

  const workflowEditorPage = new WorkflowEditorPage(page);
  const smsModalPage1 = await workflowEditorPage.addAndEditInSmsNode();
  await smsModalPage1.fillSmsBody('first content for sms');
  await smsModalPage1.nodeSettingsUpdateButton().click();

  await smsModalPage1.closeSidePanel();

  const smsModalPage2 = await workflowEditorPage.addAndEditInSmsNode();
  await smsModalPage2.fillSmsBody('second content for sms');
  await smsModalPage2.nodeSettingsUpdateButton().click();

  await smsModalPage2.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.SMS, false);
  await workflowEditorPage.editAction().click();
  await expect(smsModalPage1.getMonacoEditor()).toContainText('first content for sms');

  await smsModalPage1.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.SMS, true);
  await workflowEditorPage.editAction().click();
  await expect(smsModalPage2.getMonacoEditor()).toContainText('second content for sms');
});
