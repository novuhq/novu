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
  await createNotifications({
    identifier: session.templates[0].triggers[0].identifier,
    token: session.token,
    count: 2,
    organizationId: session.organization._id,
    environmentId: session.environment._id,
  });
});

test.skip('TODO - should be able to add a new channel', async ({ page }) => {
  await page.goto('/activities');
  await expect(page).toHaveURL(/\/activities/);

  const addChannelButton = page.getByTestId('activity-stats-weekly-sent');
  await expect(addChannelButton).toContainText('25');
});

test.skip('TODO - Contains expected UI elements', async ({ page }) => {
  const activitiesPage = await ActivitiesPage.goTo(page);
  const locator = activitiesPage.getActivityRowElements().first();
  await expect(locator).toContainText(session.templates[0].name);
  await activitiesPage.assertContainsExpectedUIElements();
});

test.skip('TODO - when not having SMS activities, filtering by SMS should show empty result set', async ({ page }) => {
  const activitiesPage = await ActivitiesPage.goTo(page);
  await expect(activitiesPage.getEmailStep()).toHaveCount(10);
  await activitiesPage.filterChannelSearchBy(FILTER_TERM.SMS);
  await activitiesPage.submitFilters();
  await expect(activitiesPage.getEmailStep()).toHaveCount(0);
});

test.skip('TODO - shows clear filters button when filters are present', async ({ page }) => {
  const activitiesPage = await ActivitiesPage.goTo(page);
  await activitiesPage.filterChannelSearchBy(FILTER_TERM.SMS);
  await activitiesPage.assertHasClearFiltersButtonEnabled();
});

test.skip('TODO - should clear filters when clicking clear filters button', async ({ page }) => {
  const activitiesPage = await ActivitiesPage.goTo(page);
  await activitiesPage.filterChannelSearchBy(FILTER_TERM.SMS);
  await activitiesPage.filterByFirstWorkflow();
  await activitiesPage.filterByTransaction('some value');
  await activitiesPage.filterBySubscriber('some value');
  await activitiesPage.clearFiltersButton().click();
  await activitiesPage.assertHasNoFilterValues();
});

// it('should show errors and warning', function () {
//   cy.intercept(/.*notifications\?page.*/, (r) => {
//     r.continue((res) => {
//       if (!res.body?.data) return;
//       res.body.data[0].jobs[0].status = JobStatusEnum.FAILED;
//       res.send({ body: res.body });
//     });
//   });
//   cy.visit('/activities');
//   cy.waitForNetworkIdle(500);
//   cy.getByTestId('activities-table')
//     .find('button')
//     .first()
//     .getByTestId('status-badge-item')
//     .eq(0)
//     .should('have.css', 'color')
//     .and('eq', 'rgb(229, 69, 69)');
// });
