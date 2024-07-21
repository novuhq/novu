import { Page } from '@playwright/test';
import { waitForNetworkIdle } from '../utils/browser';

export class HeaderPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  static async goTo(page: Page): Promise<HeaderPage> {
    await page.goto('./');

    return new HeaderPage(page);
  }

  getAvatarImageSrc() {
    const locator = this.page.locator('[data-test-id="header-profile-avatar"] >> img');

    return locator.first().getAttribute('src');
  }

  getUserName() {
    return this.page.getByTestId('header-dropdown-username').textContent();
  }

  getOrganizationName() {
    return this.page.getByTestId('header-dropdown-organization-name').textContent();
  }

  async clickAvatar() {
    await this.page.getByTestId('header-profile-avatar').click();
  }

  async clickLogout() {
    await this.page.getByTestId('logout-button').click();
  }
}
