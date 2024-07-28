import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { ApiKeysPage } from './page-models/apiKeysPage';
import { SessionData } from './utils/plugins';

let session: SessionData;

test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page));
});

test('should show/hide the API key, and display the application and environment identifier', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const apiKeyContainer = await apiKeysPage.getApiKeyContainer();
  const apiKey = session.environment.apiKeys[0].key;

  expect(apiKeyContainer).toHaveValue(apiKey);

  expect(await apiKeyContainer.getAttribute('type')).toBe('password');
  await apiKeysPage.getApiKeyVisibilityButton().click();
  expect(await apiKeyContainer.getAttribute('type')).toBe('text');
  await apiKeysPage.getApiKeyVisibilityButton().click();
  expect(await apiKeyContainer.getAttribute('type')).toBe('password');

  const environmentId = apiKeysPage.getEnvironmentID();
  const applicationId = apiKeysPage.getAppIdentifier();
  expect(applicationId).toHaveValue(session.environment.identifier);
  expect(environmentId).toHaveValue(session.environment._id);
});

test('should regenerate the API key', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const oldApiKeyValue = (await apiKeysPage.getApiKeyContainer()).inputValue();

  await apiKeysPage.regenerateApiKey();
  await apiKeysPage.assertCautionModal();

  const newApiKeyValue = (await apiKeysPage.getApiKeyContainer()).inputValue();

  await expect(newApiKeyValue).not.toBe(oldApiKeyValue);
});
