import { expect, Page } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { BillingPage } from './page-models/billingPage';
import { BillingRouteMocks } from './rest-mocks/BillingRouteMocks';
import { ApiServiceLevelEnum } from '@novu/shared';

const GREEN = 'rgb(77, 153, 128)';
const YELLOW = 'rgb(253, 224, 68)';

// TODO: new set of tests after redesign
test.describe.skip('Billing', () => {
  test.skip(process.env.NOVU_ENTERPRISE !== 'true', 'Skipping tests for non enterprise variant...');

  test.beforeEach(async ({ page }) => {
    await initializeSession(page, { noTemplates: true });
  });

  test('should display billing page', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    const billingPage = await BillingPage.goTo(page);
    await page.waitForTimeout(1000);
    await billingPage.assertBillingPlansTitle('Plans');
  });

  async function assertDynamicTimeLeftLabel(billingPage: BillingPage, timeInTrial: number) {
    await billingPage.assertTrialLabelContains(`${30 - timeInTrial}`);
  }

  test('should display free trial widget', async ({ page }) => {
    const billingPage = await testDynamicBannersInTrial(page, 0);
    await expect(billingPage.getTrialProgressBar()).toHaveCSS('width', '0px');
  });

  test('should display free trial widget after 10 days', async ({ page }) => {
    const billingPage = await testDynamicBannersInTrial(page, 10);
    await billingPage.assertTrialBarColor(GREEN);
  });

  test('should display free trial widget after 20 days', async ({ page }) => {
    const billingPage = await testDynamicBannersInTrial(page, 20);
    await billingPage.assertTrialBarColor(YELLOW);
    await billingPage.assertContactSalesBannerText('Contact sales');
  });

  test('should not display free trial widget after 30 days', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.settingsMenu.assertNoFreeTrial();
    await billingPage.assertNoFreeTrial();
  });

  test('should display free trail info on billing page', async ({ page }) => {
    await BillingRouteMocks.mockSubscriptionTrial(page, 0);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertBillingPlansTitle('Plans');
    await billingPage.assertTrialWidgetText('30 days left on your trial');
  });

  test('should be able to manage subscription', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertPlansIsTitle();
    await billingPage.waitForPlanBusinessCurrent();
    await billingPage.waitForPlanBusinessManage();
  });

  test('should be able to upgrade from free', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    await BillingRouteMocks.mockSubscriptionWithApiServiceLevel(page, ApiServiceLevelEnum.FREE);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertPlansIsTitle();
    await billingPage.waitForPlanFreeCurrent();
    await billingPage.waitForUpgradeButton();
  });

  test('full user flow from subscription to active', async ({ page }) => {
    await assertStateOnTrial(page);
    await assertTrialFinished(page);
  });

  async function assertStateOnTrial(page: Page) {
    await BillingRouteMocks.mockSubscriptionTrial(page, 20);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertPlansIsTitle();
    await billingPage.waitForPlanBusinessCurrent();
    await billingPage.waitForUpgradeButton();
    await billingPage.waitForFreeTrialWidget();
    await billingPage.assertTrialWidgetText('10 days left on your trial');
    await billingPage.waitForFreeTrialBanner();
  }
  async function testDynamicBannersInTrial(page: Page, timeInTrial: number) {
    await BillingRouteMocks.mockSubscriptionTrial(page, timeInTrial);
    const billingPage = await BillingPage.goTo(page);
    await assertDynamicTimeLeftLabel(billingPage, timeInTrial);
    await billingPage.assertUpgradeButtonTextContains('Upgrade');

    return billingPage;
  }

  async function assertTrialFinished(page: Page) {
    await BillingRouteMocks.mockActiveSubscription(page);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertNoFreeTrial();
    await billingPage.settingsMenu.assertNoFreeTrial();
    await billingPage.assertNoFreeTrialBanner();
  }
});
