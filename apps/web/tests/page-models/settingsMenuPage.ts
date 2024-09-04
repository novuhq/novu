import { Page } from '@playwright/test';
import { BrandPage } from './brandPage';

export class SettingsMenuPage {
  constructor(private page: Page) {}

  public async assertNoFreeTrial() {
    await this.page.waitForSelector('[data-test-id="free-trial-widget-text"]', { state: 'detached' });
  }
  private getWidgetFreeTrialTextLocator() {
    return this.page.locator('[data-test-id="free-trial-widget-text"]');
  }
  async clickBrandLink() {
    await this.getBrandingLinkLocator().click();

    return new BrandPage(this.page);
  }
  public getBrandingLinkLocator() {
    return this.page.getByTestId('side-nav-settings-branding-link');
  }
}
