import { expect, Page } from '@playwright/test';
import path from 'path';
import { setFileForFilePicker } from '../utils/commands';
import { SidebarPage } from './sidebarPage';

export class BrandPage {
  async assertImageSourceSetCorrectly(orgIdentifier: string) {
    expect(await this.page.getByTestId('logo-image-wrapper').getAttribute('src')).toContain('.png');
    expect(await this.page.getByTestId('logo-image-wrapper').getAttribute('src')).toContain(orgIdentifier);
  }
  public async choosesFontViaDropdown(fontFamily: string) {
    await this.page.getByTestId('font-family-selector').click();
    await this.clickElementByText(fontFamily);
  }
  constructor(private page: Page) {}
  public async clickElementByText(text: string) {
    await this.page.getByText(text).click();
  }
  static async goTo(page: Page): Promise<BrandPage> {
    const sidebarPage = await SidebarPage.goTo(page);
    const settingsMenuPage = await sidebarPage.clickSettings();

    return await settingsMenuPage.clickBrandLink();
  }

  public async submitBrandSettings() {
    await this.page.getByTestId('submit-branding-settings').click();
  }

  public async choosesColorViaButton(colorCode: string) {
    await this.page.getByTestId('color-picker').click();
    const buttonColorLabelSelector = `button[aria-label="${colorCode}"]`;
    await this.page.locator(buttonColorLabelSelector).click();
  }

  public async uploadLogoImage(imagePath: string) {
    await this.page.waitForTimeout(3000);
    const fileUploader = this.page.getByTestId('upload-image-button').locator('input[type="file"]');
    const logoPath = path.join(__dirname, imagePath);
    await setFileForFilePicker(fileUploader, logoPath);
    await this.page.waitForTimeout(3000);
    const failed = await this.page.getByText('Failed to upload branding').isVisible();
    expect(failed).toBe(false);
  }
  public async assertInputHasValue(identifier: string, value: string) {
    expect(await this.page.getByTestId(identifier).inputValue()).toBe(value);
  }
}
