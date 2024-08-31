import { Page, selectors } from '@playwright/test';

export class PasswordResetPage {
  constructor(private page: Page) {
    selectors.setTestIdAttribute('data-test-id');
  }

  static async goTo(page: Page): Promise<PasswordResetPage> {
    await page.goto('/auth/reset/request');

    return new PasswordResetPage(page);
  }

  public async setEmailTo(value: string) {
    await this.page.getByTestId('email').fill(value);
  }

  public async clickResetPasswordButton() {
    await this.page.getByTestId('submit-btn').click();
  }
}
