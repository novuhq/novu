import { test, expect } from '@playwright/test';
import os from 'node:os';

import { dragAndDrop, getByTestId, initializeSession } from './utils.ts/browser';
import {
  addAndEditChannel,
  editChannel,
  fillBasicNotificationDetails,
  goBack,
  updateWorkflowButtonClick,
} from './utils.ts/workflow-editor';

let session;

const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';

test.beforeEach(async ({ context }) => {
  session = await initializeSession(context);
});

test('should not reset data when switching channel types', async ({ page }) => {
  await page.goto('/workflows/create');

  await fillBasicNotificationDetails(page);
  await goBack(page);
  await addAndEditChannel(page, 'inApp');

  const editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('{{firstName}} someone assigned you to {{taskName}}');

  await goBack(page);
  await addAndEditChannel(page, 'email');

  const subjectEl = getByTestId(page, 'emailSubject');
  await subjectEl.fill('this is email subject');

  const preheaderEl = getByTestId(page, 'emailPreheader');
  await preheaderEl.fill('this is email preheader');

  const editableText = getByTestId(page, 'editable-text-content');
  await editableText.clear();
  await editableText.pressSequentially('This text is written from a test {{firstName}}');

  await goBack(page);

  await editChannel(page, 'inApp');
  await goBack(page);

  await editChannel(page, 'email');
  await expect(getByTestId(page, 'emailSubject')).toHaveValue('this is email subject');
  await expect(getByTestId(page, 'emailPreheader')).toHaveValue('this is email preheader');
  await expect(getByTestId(page, 'editable-text-content')).toContainText('This text is written from a test');
});

test('should update to empty data when switching from editor to customHtml', async ({ page }) => {
  await page.goto('/workflows/create');

  await fillBasicNotificationDetails(page, { title: 'Test Notification' });
  await goBack(page);
  await addAndEditChannel(page, 'email');

  const editableText = getByTestId(page, 'editable-text-content');
  await editableText.clear();
  await editableText.pressSequentially('This text is written from a test {{firstName}}');

  let subjectEl = getByTestId(page, 'emailSubject');
  await subjectEl.fill('this is email subject');

  await updateWorkflowButtonClick(page);

  await page
    .locator('[data-test-id="editor-type-selector"] .mantine-Tabs-tabsList')
    .getByText(/Custom Code/)
    .first()
    .click();

  subjectEl = getByTestId(page, 'emailSubject');
  await subjectEl.clear();
  await subjectEl.fill('new email subject');

  await updateWorkflowButtonClick(page, { noWaitAfter: true });

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

test('should save avatar enabled and content for in app', async ({ page }) => {
  await page.goto('/workflows/create');

  await fillBasicNotificationDetails(page, { title: 'Test save avatar' });
  await goBack(page);
  await addAndEditChannel(page, 'inApp');

  const editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('new content for notification');

  const enableAddAvatar = getByTestId(page, 'enable-add-avatar');
  await enableAddAvatar.click();
  const chooseAvatar = getByTestId(page, 'choose-avatar-btn');
  await chooseAvatar.click();
  const avatarIconInfo = getByTestId(page, 'avatar-icon-info');
  await avatarIconInfo.click();

  await updateWorkflowButtonClick(page);

  await expect(getByTestId(page, 'enabled-avatar')).toBeChecked();
  await expect(getByTestId(page, 'avatar-icon-info')).toBeVisible();
});

test('should edit in-app notification', async ({ page }) => {
  const template = session.templates[0];
  await page.goto(`/workflows/edit/${template._id}`);

  const settingsPage = getByTestId(page, 'settings-page');
  await settingsPage.click();

  let nameInput = getByTestId(page, 'name-input');
  await expect(nameInput.first()).toHaveValue(template.name);

  await goBack(page);
  await editChannel(page, 'inApp');

  let editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('Test content for <b>{{firstName}}</b>');

  await goBack(page);

  nameInput = getByTestId(page, 'name-input');
  await nameInput.clear();
  await nameInput.fill('This is the new notification title');

  await editChannel(page, 'inApp');
  const feedButton = getByTestId(page, 'feed-button-1');
  await feedButton.click();

  const monacoEditor = page.locator('.monaco-editor').nth(0);
  await monacoEditor.click();
  await monacoEditor.press(`${modifier}+KeyX`);
  await page.keyboard.type('new content for notification');

  await goBack(page);

  await updateWorkflowButtonClick(page);

  await page.goto(`/workflows`);
  const notificationsTemplate = getByTestId(page, 'notifications-template');
  await expect(await notificationsTemplate.getByText(/This is the new notification title/)).toBeVisible();

  await page.goto(`/workflows/edit/${template._id}`);
  await editChannel(page, 'inApp');

  await expect(getByTestId(page, 'feed-button-0')).toBeVisible();
  await expect(getByTestId(page, 'feed-button-1-checked')).toBeVisible();
  const createFeedInput = getByTestId(page, 'create-feed-input');
  await createFeedInput.fill('test4');

  const addFeedButton = getByTestId(page, 'add-feed-button');
  await addFeedButton.click();
  await expect(getByTestId(page, 'feed-button-2-checked')).toBeVisible();
});

test('should unset feedId for in app step', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);
  await editChannel(page, 'inApp');

  let feedsCheckbox = getByTestId(page, 'use-feeds-checkbox');
  await expect(feedsCheckbox).toBeChecked();
  await feedsCheckbox.click();

  await updateWorkflowButtonClick(page);

  await page.goto(`/workflows`);

  const notificationsTemplate = getByTestId(page, 'notifications-template');
  await expect(notificationsTemplate.getByText(template.name, { exact: false })).toBeVisible();

  await page.goto(`/workflows/edit/${template._id}`);
  await editChannel(page, 'inApp');

  feedsCheckbox = getByTestId(page, 'use-feeds-checkbox');
  await expect(feedsCheckbox).not.toBeChecked();
});

test('should edit email notification', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);
  await editChannel(page, 'email');

  const emailEditor = getByTestId(page, 'email-editor');
  const firstEditorRow = getByTestId(emailEditor, 'editor-row').first();
  await firstEditorRow.click();
  await firstEditorRow.press(`${modifier}+KeyA`);
  await firstEditorRow.press(`${modifier}+KeyX`);
  await page.keyboard.type('Hello world!');
});

test('should update notification active status', async ({ page }) => {
  const template = session.templates[0];

  await page.goto(`/workflows/edit/${template._id}`);

  let settingsPage = getByTestId(page, 'settings-page');
  await settingsPage.click();

  const toggleSwitch = getByTestId(page, 'active-toggle-switch');
  await expect(toggleSwitch).toBeVisible();
  await expect(page.getByText('Active')).toBeVisible();
  await toggleSwitch.locator('~ label').click({ force: true });
  await expect(page.getByText('Inactive')).toBeVisible();

  await page.goto(`/workflows/edit/${template._id}`);

  settingsPage = getByTestId(page, 'settings-page');
  await settingsPage.click();

  await expect(page.getByText('Inactive')).toBeVisible();
});

test('should toggle active states of channels', async ({ page }) => {
  await page.goto(`/workflows/create`);

  await fillBasicNotificationDetails(page, { title: 'Test toggle active states of channels' });
  await goBack(page);

  await addAndEditChannel(page, 'email');

  let stepActiveSwitch = getByTestId(page, 'step-active-switch');
  await expect(stepActiveSwitch).toHaveValue('on');

  await stepActiveSwitch.locator('~ label').click({ force: true });
  await stepActiveSwitch.locator('~ label').click({ force: true });

  await goBack(page);

  await addAndEditChannel(page, 'inApp');
  stepActiveSwitch = getByTestId(page, 'step-active-switch');
  await expect(stepActiveSwitch).toHaveValue('on');
});

test('should show trigger snippet block when editing', async ({ page }) => {
  const template = session.templates[0];
  await page.goto(`/workflows/edit/${template._id}`);

  const getSnippetButton = getByTestId(page, 'get-snippet-btn');
  await getSnippetButton.click();

  const triggerCodeSnippet = getByTestId(page, 'trigger-code-snippet');
  await expect(triggerCodeSnippet).toContainText('test-event');
});

test('should show error on node if message field is missing', async ({ page }) => {
  await page.goto(`/workflows/create`);

  await fillBasicNotificationDetails(page);
  await goBack(page);

  await dragAndDrop(page, `dnd-emailSelector`, 'addNodeButton');
  let emailNode = getByTestId(page, 'node-emailSelector');
  let errorCircle = getByTestId(emailNode, 'error-circle');
  await expect(errorCircle).toBeVisible();

  await editChannel(page, 'email');
  const emailSubject = getByTestId(page, 'emailSubject');
  await expect(emailSubject).toHaveClass(/mantine-TextInput-invalid/);

  await emailSubject.fill('this is email subject');
  await goBack(page);
  emailNode = getByTestId(page, 'node-emailSelector');
  errorCircle = getByTestId(emailNode, 'error-circle');
  await expect(errorCircle).not.toBeVisible();
});

test('should allow uploading a logo from email editor', async ({ page }) => {
  await page.route('**/organizations', async (route) => {
    const response = await page.request.fetch(route.request());
    const body = await response.json();
    if (body) {
      delete body.data[0].branding.logo;
    }

    await route.fulfill({
      response,
      body,
    });
  });

  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'Test allow uploading a logo from email editor' });
  await goBack(page);

  await addAndEditChannel(page, 'email');
  const uploadImageButton = getByTestId(page, 'upload-image-button');
  await uploadImageButton.click();

  const modalButton = page.getByRole('button', { name: 'Yes' });

  await modalButton.click();
  await expect(page.url()).toContain('/brand');
});

test('should show the brand logo on main page', async ({ page }) => {
  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'Test allow uploading a logo from email editor' });
  await goBack(page);

  await addAndEditChannel(page, 'email');

  const brandLogo = getByTestId(page, 'brand-logo');
  await expect(brandLogo).toHaveAttribute('src', 'https://web.novu.co/static/images/logo-light.png');
});

test('should support RTL text content', async ({ page }) => {
  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'Test support RTL text content' });
  await goBack(page);

  await addAndEditChannel(page, 'email');

  let editableTextContent = getByTestId(page, 'editable-text-content');
  await editableTextContent.hover();
  await expect(editableTextContent).toHaveCSS('text-align', 'left');

  const settingsRowButton = getByTestId(page, 'settings-row-btn');
  await settingsRowButton.click();

  const alignRightButton = getByTestId(page, 'align-right-btn');
  await alignRightButton.click();
  editableTextContent = getByTestId(page, 'editable-text-content');
  await expect(editableTextContent).toHaveCSS('text-align', 'right');
});

test('should create an SMS channel message', async ({ page }) => {
  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'Test SMS Notification Title' });
  await goBack(page);

  await addAndEditChannel(page, 'sms');

  const editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('{{firstName}} someone assigned you to {{taskName}}');
  await goBack(page);

  const submitButton = getByTestId(page, 'notification-template-submit-btn');
  await submitButton.click();

  const getSnippetButton = getByTestId(page, 'get-snippet-btn');
  await getSnippetButton.click();
  const workflowSidebar = getByTestId(page, 'workflow-sidebar');
  await expect(workflowSidebar).toBeVisible();
  const triggerCodeSnippet = getByTestId(workflowSidebar, 'trigger-code-snippet');
  await expect(triggerCodeSnippet).toContainText('test-sms-notification-title');
  await expect(triggerCodeSnippet).toContainText("import { Novu } from '@novu/node'");
  await expect(triggerCodeSnippet).toContainText('taskName');
  await expect(triggerCodeSnippet).toContainText('firstName');
});

test('should save HTML template email', async ({ page }) => {
  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'Custom Code HTML Notification Title' });
  await goBack(page);

  await addAndEditChannel(page, 'email');

  const subjectEl = getByTestId(page, 'emailSubject');
  await subjectEl.fill('this is email subject');

  await page
    .locator('[data-test-id="editor-type-selector"] .mantine-Tabs-tabsList')
    .getByText(/Custom Code/)
    .first()
    .click();

  let editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('Hello world code {{name}} <div>Test</div>');

  await goBack(page);

  await editChannel(page, 'email');

  editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await expect(editorParent).toContainText('Hello world code {{name}} <div>Test</div>');
});

test('should redirect to the workflows page when switching environments', async ({ page }) => {
  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'Environment Switching' });
  await goBack(page);

  await updateWorkflowButtonClick(page);

  await page.goto(`/changes`);
  const promoteChangesPromise = page.waitForResponse((response) => {
    return !!response.url().match(/\/v1\/changes\/.*\/apply/) && response.request().method() === 'POST';
  });
  const promoteButton = getByTestId(page, 'promote-btn').first();
  await promoteButton.click();
  await promoteChangesPromise;

  let environmentSwitchPromise = page.waitForResponse((response) => {
    return !!response.url().match(/\/auth\/environments\/.*\/switch/) && response.request().method() === 'POST';
  });
  let environmentSwitch = getByTestId(page, 'environment-switch');
  const productionButton = environmentSwitch.getByText('Production');
  await productionButton.click();
  await environmentSwitchPromise;
  await expect(page).toHaveURL(/\/workflows/);

  const notificationsTemplate = getByTestId(page, 'notifications-template');
  await notificationsTemplate.getByText(/Environment Switching/).click();
  await expect(page).toHaveURL(/\/workflows\/edit/);

  environmentSwitchPromise = page.waitForResponse((response) => {
    return !!response.url().match(/\/auth\/environments\/.*\/switch/) && response.request().method() === 'POST';
  });
  environmentSwitch = getByTestId(page, 'environment-switch');
  const developmentButton = environmentSwitch.getByText('Development');
  await developmentButton.click();
  await environmentSwitchPromise;
  await expect(page).toHaveURL(/\/workflows/);
});

test('New workflow button should be disabled in the Production', async ({ page }) => {
  await page.goto(`/workflows`);

  let environmentSwitch = getByTestId(page, 'environment-switch');
  const productionButton = environmentSwitch.getByText('Production');
  await productionButton.click();

  const createWorkflowButton = getByTestId(page, 'create-workflow-btn');
  await expect(createWorkflowButton).toBeDisabled();
});

test('Should not allow to go to New Template page in Production', async ({ page }) => {
  await page.goto(`/workflows/create`);

  let environmentSwitch = getByTestId(page, 'environment-switch');
  const productionButton = environmentSwitch.getByText('Production');
  await productionButton.click();

  await expect(page.url()).toContain('/workflows');
});

test('should save Cta buttons state in inApp channel', async ({ page }) => {
  await page.goto(`/workflows/create`);
  await fillBasicNotificationDetails(page, { title: 'In App CTA Button' });
  await goBack(page);

  await addAndEditChannel(page, 'inApp');
  const editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('Text content');

  const controlAdd = getByTestId(page, 'control-add').first();
  await controlAdd.click();

  const clickArea = getByTestId(page, 'template-container-click-area').first();
  await clickArea.click();

  await goBack(page);

  await updateWorkflowButtonClick(page);

  await page.goto(`/workflows`);

  const notificationsTemplate = getByTestId(page, 'notifications-template');
  await notificationsTemplate.getByText(/In App CTA Button/).click();
  await expect(page.url()).toContain('/workflows/edit');

  await editChannel(page, 'inApp');

  const templateContainerInput = getByTestId(page, 'template-container').first().locator('input');
  await expect(templateContainerInput).toHaveCount(1);

  const removeButton = getByTestId(page, 'remove-button-icon');
  await removeButton.click();

  await goBack(page);

  await editChannel(page, 'inApp');
  getByTestId(page, 'control-add').first();
});

test('should load successfully the recently created notification template, when going back from editor -> templates list -> editor', async ({
  page,
}) => {
  await page.goto(`/workflows`);

  const createWorkflowButton = getByTestId(page, 'create-workflow-btn');
  await createWorkflowButton.click();

  const createBlankWorkflow = getByTestId(page, 'create-workflow-blank');
  await createBlankWorkflow.click();

  await fillBasicNotificationDetails(page, { title: 'Test notification' });
  await goBack(page);

  await addAndEditChannel(page, 'inApp');
  const editorParent = page.locator('.monaco-editor textarea').locator('xpath=..');
  await editorParent.click();
  await editorParent.locator('textarea').fill('Test in-app');
  await goBack(page);

  await addAndEditChannel(page, 'email');
  const editableText = getByTestId(page, 'editable-text-content');
  await editableText.clear();
  await editableText.pressSequentially('Test email');
  const subjectEl = getByTestId(page, 'emailSubject');
  await subjectEl.fill('this is email subject');
  const emailPreheader = getByTestId(page, 'emailPreheader');
  await emailPreheader.fill('this is email preheader');
  await goBack(page);

  await updateWorkflowButtonClick(page);

  const workflowsLink = getByTestId(page, 'side-nav-templates-link');
  await workflowsLink.click();

  const notificationsTemplate = getByTestId(page, 'notifications-template');
  await notificationsTemplate.getByText(/Test notification/).click();
  await expect(page.url()).toContain('/workflows/edit');

  const inAppNode = getByTestId(page, 'node-inAppSelector');
  await expect(inAppNode).toBeVisible();
  const emailNode = getByTestId(page, 'node-emailSelector');
  await expect(emailNode).toBeVisible();
});

test('should load successfully the same notification template, when going back from templates list -> editor -> templates list -> editor', async ({
  page,
}) => {
  await page.goto(`/workflows`);
  const template = session.templates[0];

  let notificationsTemplate = getByTestId(page, 'notifications-template');
  await notificationsTemplate.getByText(template.name).click();
  await expect(page.url()).toContain('/workflows/edit');

  let inAppNode = getByTestId(page, 'node-inAppSelector');
  await expect(inAppNode).toBeVisible();
  let emailNode = getByTestId(page, 'node-emailSelector');
  await expect(emailNode).toBeVisible();

  const workflowsLink = getByTestId(page, 'side-nav-templates-link');
  await workflowsLink.click();

  notificationsTemplate = getByTestId(page, 'notifications-template');
  await notificationsTemplate.getByText(template.name).click();
  await expect(page.url()).toContain('/workflows/edit');

  inAppNode = getByTestId(page, 'node-inAppSelector');
  await expect(inAppNode).toBeVisible();
  emailNode = getByTestId(page, 'node-emailSelector');
  await expect(emailNode).toBeVisible();
});
