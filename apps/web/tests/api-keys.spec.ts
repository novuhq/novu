import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';
import { ApiKeysPage } from './page-models/apiKeysPage';
import { getClipboardValue } from './utils.ts/commands';
import { SessionData } from './utils.ts/plugins';
import { FeatureFlagsMock } from './utils.ts/featureFlagsMock';

let featureFlagsMock: FeatureFlagsMock, session: SessionData;
test.beforeEach(async ({ page }) => {
  ({ featureFlagsMock, session } = await initializeSession(page));
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_BILLING_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test('should display the API key of the app', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  await expect(apiKeysPage.getApiKeyContainer()).toHaveValue(session.environment.apiKeys[0].key);
});

test('should show and hide the API key', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const apiKeyContainer = apiKeysPage.getApiKeyContainer();
  expect(await apiKeyContainer.getAttribute('type')).toBe('password');
  await apiKeysPage.getApiKeyVisibilityButton().click();
  expect(await apiKeyContainer.getAttribute('type')).toBe('text');
  await apiKeysPage.getApiKeyVisibilityButton().click();
  expect(await apiKeyContainer.getAttribute('type')).toBe('password');
});

test.skip('should copy the API key', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const apiKey = apiKeysPage.getApiKeyContainer();
  await apiKeysPage.getCopyButton('api-key').focus();
  await apiKeysPage.getCopyButton('api-key').click();

  // TODO: no value is copied to the clipboard in the test env
  const clipboardText = await getClipboardValue(page);
  expect(clipboardText).toEqual(apiKey);
});

test('should display the Application Identifier', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const applicationIdentifier = apiKeysPage.getAppIdentifier();
  await expect(applicationIdentifier).toHaveValue(session.environment.identifier);
});

test('should display the Environment ID', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const applicationIdentifier = apiKeysPage.getEnvironmentID();
  await expect(applicationIdentifier).toHaveValue(session.environment._id);
});

test('should regenerate the API key', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const apiKey = await apiKeysPage.getApiKeyContainer().inputValue();
  await apiKeysPage.regenerateApiKey();
  await apiKeysPage.assertCautionModal();
  const newApiKey = apiKeysPage.getApiKeyContainer();
  await expect(newApiKey).not.toHaveValue(apiKey);
});
