import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { ActivitiesPage, FILTER_TERM } from './page-models/activitiesPage';

import { initializeSession } from './utils.ts/browser';
import { createNotifications, SessionData } from './utils.ts/plugins';
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

test('displays and filter activity feed', async ({ page }) => {
  await createNotifications({
    identifier: session.templates[0].triggers[0].identifier,
    token: session.token,
    count: 25,
    organizationId: session.organization._id,
    environmentId: session.environment._id,
  });

  const activitiesPage = await ActivitiesPage.goTo(page);
  await expect(page).toHaveURL(/\/activities/);

  const addChannelButton = page.getByTestId('activity-stats-weekly-sent');
  await expect(addChannelButton).toContainText('25');

  const locator = activitiesPage.getActivityRowElements().first();
  await expect(locator).toContainText(session.templates[0].name);
  await activitiesPage.assertContainsExpectedUIElements();

  await expect(activitiesPage.getEmailStep()).toHaveCount(10);
  await activitiesPage.filterChannelSearchBy(FILTER_TERM.SMS);
  await activitiesPage.submitFilters();
  await expect(activitiesPage.getEmailStep()).toHaveCount(0);

  await activitiesPage.filterByFirstWorkflow();
  await activitiesPage.filterByTransaction('some value');
  await activitiesPage.filterBySubscriber('some value');
  await activitiesPage.clearFiltersButton().click();
  await activitiesPage.assertHasNoFilterValues();
});
