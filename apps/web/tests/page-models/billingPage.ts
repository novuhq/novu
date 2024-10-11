import { expect, Page } from '@playwright/test';
import { SettingsMenuPage } from './settingsMenuPage';

export class BillingPage {
  public settingsMenu: SettingsMenuPage;
  constructor(private page: Page) {
    this.settingsMenu = new SettingsMenuPage(page);
  }

  static async goTo(page: Page): Promise<BillingPage> {
    await page.goto('/settings/billing');

    return new BillingPage(page);
  }

  public async getPlanTitle() {
    return await this.page.getByTestId('plan-title').textContent();
  }

  public async assertNoFreeTrial() {
    await this.page.waitForSelector('[data-test-id="free-trial-plan-widget"]', { state: 'detached' });
  }

  public waitForFreeTrialWidget() {
    return this.page.waitForSelector('[data-test-id="free-trial-plan-widget"]');
  }

  public getTrialLabel() {
    return this.page.locator('[data-test-id="free-trial-widget-text"]');
  }

  public getTrialProgressBar() {
    return this.page.locator('[data-test-id="free-trial-widget-progress"] .mantine-Progress-bar');
  }

  public getUpgradeTrialButton() {
    return this.page.locator('[data-test-id="free-trial-widget-button"]');
  }

  public async assertTrialLabelContains(expectedLabel: string) {
    const trialLabel = this.getTrialLabel();
    await expect(trialLabel).toContainText(expectedLabel);
  }

  public async assertTrialBarColor(expectedColor: string) {
    const color = await this.getTrialProgressBarColor();
    expect(color).toBe(expectedColor);
  }

  public async getTrialProgressBarColor() {
    return await this.page.$eval('[data-test-id="free-trial-widget-progress"] .mantine-Progress-bar', (element) =>
      getComputedStyle(element).getPropertyValue('background-color')
    );
  }

  public async assertFreeTrialBannerText(expectedBannerText: string) {
    await this.page.waitForSelector('[data-test-id="free-trial-banner"]');
    await this.page.waitForSelector('[data-test-id="free-trial-banner-upgrade"]');
    const upgradeText = await this.page.$eval(
      '[data-test-id="free-trial-banner-upgrade"]',
      (element) => element.textContent
    );
    expect(upgradeText).toBe(expectedBannerText);
  }

  public async assertContactSalesBannerText(contactSales: string) {
    await this.page.waitForSelector('[data-test-id="free-trial-banner-contact-sales"]');
    const contactSalesText = await this.page.$eval(
      '[data-test-id="free-trial-banner-contact-sales"]',
      (element) => element.textContent
    );
    expect(contactSalesText).toBe(contactSales);
  }

  public async assertUpgradeButtonTextContains(expected: string) {
    const upgradeTrialButton = await this.getUpgradeTrialButton().textContent();
    expect(upgradeTrialButton).toContain(expected);
  }

  async assertBillingPlansTitle(expectedText: string) {
    expect(await this.getPlanTitle()).toBe(expectedText);
  }

  public async waitForPlanBusinessCurrent() {
    await this.page.waitForSelector('[data-test-id="plan-business-current"]');
  }

  public async waitForPlanBusinessManage() {
    await this.page.waitForSelector('[data-test-id="plan-business-manage"]');
  }

  async assertPlansIsTitle() {
    await this.assertBillingPlansTitle('Plans');
  }
  public async waitForPlanFreeCurrent() {
    await this.page.waitForSelector('[data-test-id="plan-free-current"]');
  }

  public async waitForUpgradeButton() {
    await this.page.waitForSelector('[data-test-id="plan-business-upgrade"]');
  }

  async waitForFreeTrialBanner() {
    await this.page.waitForSelector('[data-test-id="free-trial-banner"]');
  }

  async assertNoFreeTrialBanner() {
    await this.page.waitForSelector('[data-test-id="free-trial-banner"]', { state: 'detached' });
  }

  async assertTrialWidgetText(expectedText: string) {
    const actualContent = await this.page.locator('[data-test-id="free-trial-plan-widget"]').textContent();
    expect(actualContent).toBe(expectedText);
  }
}
