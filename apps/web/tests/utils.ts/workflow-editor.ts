import { Page } from '@playwright/test';

import { dragAndDrop, getByTestId } from './browser';

export type Channel = 'inApp' | 'email' | 'sms' | 'chat' | 'push' | 'digest' | 'delay';

export async function fillBasicNotificationDetails(
  page: Page,
  { title, description }: { title?: string; description?: string } = {}
) {
  const settings = await getByTestId(page, 'settings-page');
  await settings.click();

  const titleEl = await getByTestId(page, 'title');
  await titleEl.first().clear();
  await titleEl.first().fill(title ?? 'Test Notification Title');

  const descriptionEl = await getByTestId(page, 'description');
  await descriptionEl.fill(description ?? 'This is a test description for a test title');
}

export async function goBack(page: Page) {
  const closeButton = await getByTestId(page, 'sidebar-close');
  await closeButton.click();
}

export async function editChannel(page: Page, channel: Channel) {
  const stepNode = await getByTestId(page, `node-${channel}Selector`);
  await stepNode.last().click();

  if (['inApp', 'email', 'sms', 'chat', 'push'].includes(channel)) {
    const sidebarComponent = await getByTestId(page, 'step-editor-sidebar');
    const editButton = await getByTestId(sidebarComponent, 'edit-action');
    await editButton.click();
  }
}

export async function addAndEditChannel(page: Page, channel: Channel) {
  await dragAndDrop(page, `dnd-${channel}Selector`, 'addNodeButton');
  await editChannel(page, channel);
}

export async function updateWorkflowButtonClick(page: Page, { noWaitAfter = false }: { noWaitAfter?: boolean } = {}) {
  if (noWaitAfter) {
    const updateWorkflowButton = getByTestId(page, 'notification-template-submit-btn');
    await updateWorkflowButton.click();

    return;
  }

  const updateTemplateRequest = page.waitForResponse((response) => {
    return response.url().match(/\/v1\/notification-templates\/.*/) && response.request().method() === 'PUT';
  });
  const getTemplateRequest = page.waitForResponse((response) => {
    return response.url().match(/\/v1\/notification-templates\/.*/) && response.request().method() === 'GET';
  });
  let updateWorkflowButton = getByTestId(page, 'notification-template-submit-btn');
  await updateWorkflowButton.click();
  await updateTemplateRequest;
  await getTemplateRequest;
}
