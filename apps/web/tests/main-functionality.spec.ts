import { test, expect } from '@playwright/test';
import os from 'node:os';

import { getByTestId, initializeSession } from './utils.ts/browser';
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

  expect(getByTestId(page, 'enabled-avatar')).toBeChecked();
  expect(getByTestId(page, 'avatar-icon-info')).toBeVisible();
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
