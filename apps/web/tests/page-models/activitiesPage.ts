import { expect, Page } from '@playwright/test';

export enum FILTER_TERM {
  EMAIL = 'Email',
  IN_APP = 'In-App',
  SMS = 'SMS',
  PUSH = 'Push',
}

export class ActivitiesPage {
  constructor(private page: Page) {}

  public static async goTo(page: Page) {
    const pageDataLoadedPromise = this.getPageDataLoadedPromise(page);
    await page.goto('/activities');
    await pageDataLoadedPromise;

    return new ActivitiesPage(page);
  }

  private static getPageDataLoadedPromise(page: Page) {
    const notificationsPromise = page.waitForResponse('**/notifications?page=0');
    const notificationsGraphStatsPromise = page.waitForResponse('**/notifications/graph/stats');
    const notificationsStatsPromise = page.waitForResponse('**/notifications/stats');

    return Promise.all([notificationsPromise, notificationsGraphStatsPromise, notificationsStatsPromise]);
  }

  async assertHasNoFilterValues() {
    await expect(this.page.getByTestId('subscriberId-filter')).toBeEmpty();
    await expect(this.page.getByTestId('transactionId-filter')).toBeEmpty();
    await expect(this.page.getByTestId('templates-filter').locator('.mantine-Text-root')).toHaveCount(0);
    await expect(this.page.getByTestId('activities-filter').locator('.mantine-Text-root')).toHaveCount(0);
  }

  async filterBySubscriber(filterTerm: string) {
    await this.page.getByTestId('subscriberId-filter').fill(filterTerm);
  }

  async filterByTransaction(filterTerm: string) {
    await this.page.getByTestId('transactionId-filter').fill(filterTerm);
  }

  async filterByFirstWorkflow() {
    await this.page.getByTestId('templates-filter').click();
    await this.page.locator('.mantine-MultiSelect-item').first().click();
  }

  clearFiltersButton() {
    return this.page.getByTestId('clear-filters');
  }

  async assertHasClearFiltersButtonEnabled() {
    await expect(this.clearFiltersButton()).toBeEnabled();
  }

  async submitFilters() {
    await this.page.getByTestId('submit-filters').click();
  }

  async filterChannelSearchBy(filterTerm: FILTER_TERM) {
    await this.page.getByTestId('activities-filter').click();
    await this.page.locator('.mantine-MultiSelect-item').getByText(filterTerm).click();
  }

  async assertContainsExpectedUIElements() {
    await expect(this.page.getByTestId('in_app-step').first()).toBeVisible();
    await expect(this.page.getByTestId('email-step').first()).toBeVisible();
    await expect(this.page.getByTestId('subscriber-id').first()).toBeVisible();
  }

  getActivityRowElements() {
    return this.page.getByTestId('row-template-name');
  }

  getEmailStep() {
    return this.page.getByTestId('email-step');
  }
}
