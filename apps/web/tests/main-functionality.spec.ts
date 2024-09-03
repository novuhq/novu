/* eslint-disable max-len */
import { expect } from '@playwright/test';
import os from 'node:os';
import { test } from './utils/baseTest';
import { ChangesPage } from './page-models/changesPage';
import { NodeEmailEditorPageModal } from './page-models/nodeEmailEditorPageModal';
import { NodeInAppEditingModalPageModel } from './page-models/nodeInAppEditingModalPageModel';
import { SidebarPage } from './page-models/sidebarPage';
import { WorkflowEditorPage } from './page-models/workflowEditorPage';
import { WorkflowsPage } from './page-models/workflowsPage';
import { initializeSession, waitForNetworkIdle } from './utils/browser';
import { ChannelType } from './utils/ChannelType';
import { SessionData } from './utils/plugins';

const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';

let session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
});

test('should not reset data when switching channel types', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test notification title',
  });
  await workflowSidePanel.closeSidePanel();

  const inAppNodeModal = await workflowEditorPage.addAndEditInAppNode();
  await inAppNodeModal.fillNotificationBody('{{firstName}} someone assigned you to {{taskName}}');
  await inAppNodeModal.closeSidePanel();

  const emailNodeModal = await workflowEditorPage.addAndEditEmailNode();

  await emailNodeModal.fillEmailSubject('this is email subject');
  await emailNodeModal.fillEmailPreheader('this is email preheader');

  await emailNodeModal.editEmailBodyTextParagraph('This text is written from a test {{firstName}}');
  await emailNodeModal.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.EMAIL);
  await workflowEditorPage.editAction().click();
  await expect(emailNodeModal.emailSubject()).toHaveValue('this is email subject');
  await expect(emailNodeModal.emailPreheader()).toHaveValue('this is email preheader');
  await expect(emailNodeModal.editableTextContent()).toContainText('This text is written from a test');
});

test.skip('should update to empty data when switching from editor to customHtml', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test notification title',
  });
  await workflowSidePanel.closeSidePanel();

  const emailNodeModal = await workflowEditorPage.addAndEditEmailNode();
  await emailNodeModal.editEmailBodyTextParagraph('This text is written from a test {{firstName}}');
  await emailNodeModal.fillEmailSubject('this is email subject');
  await emailNodeModal.getNotificationTemplateSubmitButton().click();

  await waitForNetworkIdle(page);
  await emailNodeModal.getCustomCodeEditorType().click({ force: true });
  await waitForNetworkIdle(page);

  await emailNodeModal.fillEmailSubject('new email subject');
  await emailNodeModal.getNotificationTemplateSubmitButton().click();

  const workflowsPage = await WorkflowsPage.goTo(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await workflowsTable.getByText('Test Notification').click();

  await page
    .locator('[data-test-id="editor-type-selector"] .mantine-Tabs-tabsList')
    .getByText(/Custom Code/)
    .first()
    .click();

  subjectEl = getByTestId(page, 'emailSubject');
  await subjectEl.clear();
  await subjectEl.fill('new email subject');

  await updateWorkflowButtonClick(page);

  const templatesLinkPage = getByTestId(page, 'side-nav-templates-link');
  await templatesLinkPage.click();

  const notificationsTemplate = getByTestId(page, 'notifications-template');
  await notificationsTemplate.getByText(/Test Notification/).click();

  await editChannel(page, 'email');

  await expect(
    page
      .locator('[data-test-id="editor-type-selector"] .mantine-Tabs-tabsList')
      .locator('[data-active="true"]')
      .getByText(/Custom Code/)
      .first()
  ).toBeVisible();
});

test.skip('should save avatar enabled and content for in app', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test save avatar',
  });
  await workflowSidePanel.closeSidePanel();

  const inAppNodeModal = await workflowEditorPage.addAndEditInAppNode();
  await inAppNodeModal.fillNotificationBody('new content for notification');

  await inAppNodeModal.getEnableAddAvatarToggle().click();
  const avatarIconInfo = inAppNodeModal.getAvatarIconInfo();
  await inAppNodeModal.getChooseAvatarButton().click();
  await avatarIconInfo.click();

  await inAppNodeModal.getNotificationTemplateSubmitButton().click();
  await waitForNetworkIdle(page);

  await expect(page.getByTestId('enabled-avatar')).toBeChecked();
  await expect(avatarIconInfo).toBeVisible();
});

test('should edit in-app notification', async ({ page }) => {
  const template = session.templates[0];
  const workflowEditorPage = await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  const settingsPanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await expect(settingsPanel.getTitleLocator()).toHaveValue(template.name);
  await settingsPanel.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();
  const inAppPage = new NodeInAppEditingModalPageModel(page);
  await inAppPage.fillNotificationBody('Test content for <b>{{firstName}}</b>');
  await inAppPage.closeSidePanel();

  await workflowEditorPage.setWorkflowNameInput('This is the new notification title');
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();

  await inAppPage.getFeedButton(1).click();
  await inAppPage.fillNotificationBody('new content for notification');
  await inAppPage.closeSidePanel();
  await inAppPage.getNotificationTemplateSubmitButton().click();

  const workflowsPage = await WorkflowsPage.goTo(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await expect(workflowsTable.getByText('This is the new notification title', { exact: true })).toBeVisible();

  await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();

  await expect(inAppPage.getFeedButton(0)).toBeVisible();
  await expect(inAppPage.getFeedButtonChecked(1)).toBeVisible();

  await inAppPage.createAndFillFeedInput('test4');
  await inAppPage.getAddFeedButton().click();
  await expect(inAppPage.getFeedButtonChecked(2)).toBeVisible();
});

test('should unset feedId for in app step', async ({ page }) => {
  const template = session.templates[0];

  const workflowEditorPage = await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();
  const inAppPage = new NodeInAppEditingModalPageModel(page);

  await expect(inAppPage.getUseFeedsCheckbox()).toBeChecked();
  await inAppPage.getUseFeedsCheckbox().click();
  await inAppPage.getNotificationTemplateSubmitButton().click();

  const workflowsPage = await WorkflowsPage.goTo(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await expect(workflowsTable.getByText(template.name, { exact: false })).toBeVisible();

  await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();

  await expect(inAppPage.getUseFeedsCheckbox()).not.toBeChecked();
});

test('should edit email notification', async ({ page }) => {
  const template = session.templates[0];

  const workflowEditorPage = await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  await workflowEditorPage.clickWorkflowNode(ChannelType.EMAIL);
  await workflowEditorPage.editAction().click();

  const emailPage = new NodeEmailEditorPageModal(page);
  const firstEditorRow = emailPage.getEditorRow().first();
  await firstEditorRow.click();
  await firstEditorRow.press(`${modifier}+KeyA`);
  await firstEditorRow.press(`${modifier}+KeyX`);
  await page.keyboard.type('Hello world!');
});

test('should update notification active status', async ({ page }) => {
  const template = session.templates[0];

  const workflowEditorPage = await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  const settingsPage = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await expect(settingsPage.getActiveToggleSwitch()).toBeChecked();
  await settingsPage.clickToggleSwitch();
  await expect(settingsPage.getActiveToggleSwitch()).not.toBeChecked();

  await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  await workflowEditorPage.openWorkflowSettingsSidePanel();
  await expect(settingsPage.getActiveToggleSwitch()).not.toBeChecked();
});

test('should toggle active states of channels', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test toggle active states of channels',
  });
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.addAndEditEmailNode();
  await expect(workflowSidePanel.getStepActiveSwitch().locator('input')).toBeChecked();
  await workflowSidePanel.getStepActiveSwitch().click();
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.addAndEditInAppNode();
  await expect(workflowSidePanel.getStepActiveSwitch().locator('input')).toBeChecked();
});

test('should show trigger snippet block when editing', async ({ page }) => {
  const template = session.templates[0];
  const workflowEditorPage = await WorkflowEditorPage.goToEditWorkflow(page, template._id);
  const codeSnippet = await workflowEditorPage.clickTriggerWorkflow();
  await expect(codeSnippet.getTriggerCodeSnippet()).toContainText('test-event');
});

test('should show error on node if message field is missing', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test toggle active states of channels',
  });
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.addChannelToWorkflow(ChannelType.EMAIL);
  let errorCircle = page.getByTestId('error-circle');
  await expect(errorCircle).toBeVisible();

  await workflowEditorPage.clickWorkflowNode(ChannelType.EMAIL);
  await workflowEditorPage.editAction().first().click();
  const emailPage = new NodeEmailEditorPageModal(page);
  await expect(emailPage.emailSubject()).toHaveClass(/mantine-TextInput-invalid/);
  await emailPage.fillEmailSubject('this is email subject');
  await emailPage.closeSidePanel();

  errorCircle = page.getByTestId('error-circle');
  await expect(errorCircle).not.toBeVisible();
});

// TODO: Fix flaky test
test.skip('should allow uploading a logo from email editor', async ({ page }) => {
  await page.route('**/v1/organizations', async (route) => {
    const response = await page.request.fetch(route.request());
    const body = await response.json();
    if (body) {
      delete body.data[0].branding.logo;
    }

    await route.fulfill({
      response,
      body: JSON.stringify({ ...body }),
    });
  });

  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test allow uploading a logo from email editor',
  });
  await workflowSidePanel.closeSidePanel();

  const emailPage = await workflowEditorPage.addAndEditEmailNode();
  await emailPage.getUploadImageButton().click();

  await page.getByRole('button', { name: 'Yes' }).click();
  // await waitForNetworkIdle(page);
  expect(page.url()).toContain('/brand');
});

test('should show the brand logo on main page', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test allow uploading a logo from email editor',
  });
  await workflowSidePanel.closeSidePanel();

  await workflowEditorPage.addAndEditChannel(ChannelType.EMAIL);

  const brandLogo = page.getByTestId('brand-logo');
  await expect(brandLogo).toHaveAttribute('src', 'https://dashboard.novu.co/static/images/logo-light.png');
});

test('should support RTL text content', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test support RTL text content',
  });
  await workflowSidePanel.closeSidePanel();

  const emailPage = await workflowEditorPage.addAndEditEmailNode();
  const editableTextContent = await emailPage.getEditableTextContentByIndex(0);
  await editableTextContent.hover();
  await expect(editableTextContent).toHaveCSS('text-align', 'left');

  await emailPage.clickSettingsRowButton();
  await emailPage.getAlignRightButton().click();

  await expect(editableTextContent).toHaveCSS('text-align', 'right');
});

test('should create an SMS channel message', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test SMS Notification Title',
  });
  await workflowSidePanel.closeSidePanel();

  const smsPage = await workflowEditorPage.addAndEditInSmsNode();
  await smsPage.fillSmsBody('{{firstName}} someone assigned you to {{taskName}}');
  await smsPage.closeSidePanel();
  await workflowEditorPage.submitTemplateBtn().click();

  const triggerCodeSnippetPage = await workflowEditorPage.clickTriggerWorkflow();
  const triggerCodeSnippet = triggerCodeSnippetPage.getTriggerCodeSnippet();

  await expect(triggerCodeSnippet).toContainText('test-sms-notification-title');
  await expect(triggerCodeSnippet).toContainText("import { Novu } from '@novu/node'");
  await expect(triggerCodeSnippet).toContainText('taskName');
  await expect(triggerCodeSnippet).toContainText('firstName');
});

test('should save HTML template email', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Custom Code HTML Notification Title',
  });
  await workflowSidePanel.closeSidePanel();

  const emailPage = await workflowEditorPage.addAndEditEmailNode();
  await emailPage.fillEmailSubject('this is email subject');
  await emailPage.getCustomCodeEditorType().click();
  await emailPage.fillEmailCustomCodeBody('Hello world code {{name}} <div>Test</div>');
  await emailPage.closeSidePanel();

  await workflowEditorPage.clickWorkflowNode(ChannelType.EMAIL);
  await workflowEditorPage.editAction().click();
  await emailPage.getMonacoEditor().click();
  await expect(emailPage.getMonacoEditor()).toContainText('Hello world code {{name}} <div>Test</div>');
});

test.skip('should redirect to the workflows page when switching environments', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Custom Code HTML Notification Title',
  });
  await workflowSidePanel.closeSidePanel();
  await workflowEditorPage.submitTemplateBtn().click();

  const changesPage = await ChangesPage.goTo(page);
  const promoteChangesPromise = page.waitForResponse((response) => {
    return !!response.url().match(/\/v1\/changes\/.*\/apply/) && response.request().method() === 'POST';
  });
  await changesPage.getPromoteButton().click();
  await promoteChangesPromise;

  await new SidebarPage(page).toggleToProduction();
  await expect(page).toHaveURL(/\/workflows/);

  await new SidebarPage(page).toggleToDevelopment();
  await expect(page).toHaveURL(/\/workflows/);
});

test.skip('New workflow button should be disabled in the Production', async ({ page }) => {
  const workflowsPage = await WorkflowsPage.goTo(page);
  await new SidebarPage(page).toggleToProduction();
  await expect(workflowsPage.getCreateWorkflowButton()).toBeDisabled();
});

test.skip('Should not allow to go to New Template page in Production', async ({ page }) => {
  await WorkflowEditorPage.goToNewWorkflow(page);
  await new SidebarPage(page).toggleToProduction();
  expect(page.url()).toContain('/workflows');
});

test.skip('should save Cta buttons state in inApp channel', async ({ page }) => {
  const workflowEditorPage = await WorkflowEditorPage.goToNewWorkflow(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'In App CTA button',
  });
  await workflowSidePanel.closeSidePanel();

  const inAppPage = await workflowEditorPage.addAndEditInAppNode();
  await inAppPage.fillNotificationBody('Text content');
  await inAppPage.getControlAddButton().click();
  await inAppPage.getTemplateContainerClickArea().first().click();

  await inAppPage.closeSidePanel();
  await workflowEditorPage.submitTemplateBtn().click();

  const workflowsPage = await WorkflowsPage.goTo(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await workflowsTable.getByText(/In App CTA button/).click();
  expect(page.url()).toContain('/workflows/edit');

  await workflowEditorPage.clickWorkflowNode(ChannelType.IN_APP);
  await workflowEditorPage.editAction().click();

  expect(inAppPage.getTemplateContainer().first().locator('input')).toHaveCount(1);
});

test.skip('should load successfully the recently created notification template, when going back from editor -> templates list -> editor', async ({
  page,
}) => {
  const workflowsPage = await WorkflowsPage.goTo(page);
  await workflowsPage.getCreateWorkflowButton().click();
  await workflowsPage.getCreateBlankWorkflowButton().click();

  const workflowEditorPage = new WorkflowEditorPage(page);
  const workflowSidePanel = await workflowEditorPage.openWorkflowSettingsSidePanel();
  await workflowSidePanel.fillBasicNotificationDetails({
    title: 'Test notification',
  });
  await workflowSidePanel.closeSidePanel();

  const inAppPage = await workflowEditorPage.addAndEditInAppNode();
  await inAppPage.fillNotificationBody('Test in-app');
  await inAppPage.closeSidePanel();

  const emailPage = await workflowEditorPage.addAndEditEmailNode();
  await emailPage.fillEmailSubject('this is email subject');
  await emailPage.fillEmailPreheader('this is email preheader');
  await emailPage.editEmailBodyTextParagraph('This text is written from a test');
  await emailPage.closeSidePanel();
  await workflowEditorPage.submitTemplateBtn().click();

  await WorkflowsPage.goTo(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await workflowsTable.getByText(/Test notification/).click();
  expect(page.url()).toContain('/workflows/edit');

  await expect(workflowEditorPage.getNode(ChannelType.IN_APP, 0)).toBeVisible();
  await expect(workflowEditorPage.getNode(ChannelType.EMAIL, 0)).toBeVisible();
});

test('should load successfully the same notification template, when going back from templates list -> editor -> templates list -> editor', async ({
  page,
}) => {
  const template = session.templates[0];
  const workflowsPage = await WorkflowsPage.goTo(page);
  const workflowsTable = workflowsPage.getWorkflowsTable();
  await workflowsTable.getByText(template.name).click();
  expect(page.url()).toContain('/workflows/edit');

  const workflowEditorPage = new WorkflowEditorPage(page);
  await expect(workflowEditorPage.getNode(ChannelType.IN_APP, 0)).toBeVisible();
  await expect(workflowEditorPage.getNode(ChannelType.EMAIL, 0)).toBeVisible();

  await WorkflowsPage.goTo(page);
  await workflowsTable.getByText(template.name).click();
  expect(page.url()).toContain('/workflows/edit');

  await expect(workflowEditorPage.getNode(ChannelType.IN_APP, 0)).toBeVisible();
  await expect(workflowEditorPage.getNode(ChannelType.EMAIL, 0)).toBeVisible();
});
