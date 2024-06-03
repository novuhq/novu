import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';
import { ApiKeysPage } from './page-models/apiKeysPage';
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

test('should show/hide the API key, and display the application and environment identifierw', async ({ page }) => {
  const apiKeysPage = await ApiKeysPage.goTo(page);
  const apiKeyContainer = apiKeysPage.getApiKeyContainer();
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
  const oldApiKeyValue = await apiKeysPage.getApiKeyContainer().inputValue();

  await apiKeysPage.regenerateApiKey();
  await apiKeysPage.assertCautionModal();

  const newApiKeyValue = await apiKeysPage.getApiKeyContainer().inputValue();

  await expect(newApiKeyValue).not.toBe(oldApiKeyValue);
});
