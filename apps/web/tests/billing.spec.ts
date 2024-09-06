import { expect, Page } from '@playwright/test';
import { test } from './utils/baseTest';
import { initializeSession, setFeatureFlag } from './utils/browser';
import { BillingPage } from './page-models/billingPage';
import { BillingRouteMocks } from './rest-mocks/BillingRouteMocks';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const GREEN = 'rgb(77, 153, 128)';
const YELLOW = 'rgb(253, 224, 68)';

test.describe('Billing', () => {
  test.skip(process.env.NOVU_ENTERPRISE !== 'true', 'Skipping tests for non enterprise variant...');

  test.beforeEach(async ({ page }) => {
    await initializeSession(page, { noTemplates: true });
    await setFeatureFlag(page, FeatureFlagsKeysEnum.IS_IMPROVED_BILLING_ENABLED, true);
  });

  test('should display billing page', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    const billingPage = await BillingPage.goTo(page);
    await page.waitForTimeout(1000);
    await billingPage.assertBillingPlansTitle('Plans');
  });

  async function assertDynamicTimeLeftLabel(billingPage: BillingPage, timeInTrial: number) {
    await billingPage.assertTrialLabelContains(`${14 - timeInTrial}`);
  }

  test('should display free trial widget', async ({ page }) => {
    const billingPage = await testDynamicBannersInTrial(page, 0);
    await expect(billingPage.getTrialProgressBar()).toHaveCSS('width', '0px');
  });

  test('should display free trial widget after 5 days', async ({ page }) => {
    const billingPage = await testDynamicBannersInTrial(page, 5);
    await billingPage.assertTrialBarColor(GREEN);
  });

  test('should display free trial widget after 11 days', async ({ page }) => {
    const billingPage = await testDynamicBannersInTrial(page, 11);
    await billingPage.assertTrialBarColor(YELLOW);
    await billingPage.assertContactSalesBannerText('Contact sales');
  });

  test('should not display free trial widget after 14 days', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.settingsMenu.assertNoFreeTrial();
    await billingPage.assertNoFreeTrial();
  });

  test('should display free trail info on billing page', async ({ page }) => {
    await BillingRouteMocks.mockSubscriptionTrial(page, 0);
    await BillingRouteMocks.mockPlanRestCall(page, { apiServiceLevel: 'business' });
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertBillingPlansTitle('Plans');
    await billingPage.assertTrialWidgetText('14 days left on your trial');
  });

  test('should be able to manage subscription', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    await BillingRouteMocks.mockPlanRestCall(page, { apiServiceLevel: 'business' });
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertPlansIsTitle();
    await billingPage.waitForPlanBusinessCurrent();
    await billingPage.waitForPlanBusinessManage();
  });

  test('should be able to upgrade from free', async ({ page }) => {
    await BillingRouteMocks.mockActiveSubscription(page);
    await BillingRouteMocks.mockPlanRestCall(page, { apiServiceLevel: 'free' });
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
    await BillingRouteMocks.mockPlanRestCall(page, { apiServiceLevel: 'business' });
    await BillingRouteMocks.mockSubscriptionTrial(page, 11);
    const billingPage = await BillingPage.goTo(page);
    await billingPage.assertPlansIsTitle();
    await billingPage.waitForPlanBusinessCurrent();
    await billingPage.waitForPlanBusinessAndPayment();
    await billingPage.waitForFreeTrialWidget();
    await billingPage.assertTrialWidgetText('3 days left on your trial');
    await billingPage.waitForFreeTrialBanner();
  }
  async function testDynamicBannersInTrial(page: Page, timeInTrial: number) {
    await BillingRouteMocks.mockPlanRestCall(page, { apiServiceLevel: 'business' });
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
