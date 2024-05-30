import { Page, expect } from '@playwright/test';

export class ApiKeysPage {
  constructor(private page: Page) {}

  static async goTo(page: Page, env = 'Development'): Promise<ApiKeysPage> {
    const pageDataLoadedPromise = this.getPageDataLoadedPromise(page);
    await page.goto(`/api-keys/${env}`);
    await pageDataLoadedPromise;

    return new ApiKeysPage(page);
  }

  private static getPageDataLoadedPromise(page: Page) {
    const apiKeysPromise = page.waitForResponse('**/environments/api-keys');
    const currentEnvironmentPromise = page.waitForResponse('**/environments/me');

    return Promise.all([apiKeysPromise, currentEnvironmentPromise]);
  }

  getApiKeyContainer() {
    return this.page.getByTestId('api-key');
  }

  getApiKeyVisibilityButton() {
    return this.page.locator('#api-key-toggle-visibility-btn');
  }

  getCopyButton(container: string) {
    return this.page.getByTestId(`${container}-copy`);
  }

  getAppIdentifier() {
    return this.page.getByTestId('application-identifier');
  }

  getEnvironmentID() {
    return this.page.getByTestId('environment-id');
  }

  async regenerateApiKey() {
    await this.page.locator('#api-key-regenerate-btn').click();
  }

  async assertCautionModal() {
    await expect(this.page.getByTestId('regenerate-api-key-modal')).toBeVisible();
    await this.page.getByTestId('regenerate-api-key-modal-button').click();
    await this.page.getByTestId('regenerate-api-key-modal').waitFor({ state: 'detached' });
  }
}
