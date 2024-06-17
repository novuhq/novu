import { expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { setFileForFilePicker } from '../utils/commands';

export class TranslationsPage {
  public async uploadTranslationFile(fileName: string) {
    const locator = this.page.getByTestId('upload-files-container').locator('input[type="file"]');
    await setFileForFilePicker(locator, fileName);
  }
  public async assertGroupDoesNotExist(identifier: string) {
    const responsePromise = this.page.waitForResponse(`**/v1/translations/groups/${identifier}`);
    await this.navigateToGroup(identifier);
    const response = await responsePromise;
    expect(response.status()).toBe(404);
  }
  public async navigateToGroup(identifier: string) {
    return await this.page.goto(`/translations/edit/${identifier}`);
  }
  public async assertHasHeading(expextedTitle: string) {
    await expect(this.page.getByRole('heading').getByText(expextedTitle)).toBeVisible();
  }
  submitDefaultLanguageButton() {
    return this.page.getByTestId('default-language-submit-btn');
  }
  public async selectDefaultLanguage(language: string) {
    await this.page.getByTestId('default-language-select').fill(language);
    await this.page.locator('.mantine-Select-item').first().click();
  }
  public addGroupButton() {
    return this.page.getByTestId('add-group-btn');
  }
  constructor(private page: Page) {}

  public static async goTo(page: Page) {
    await page.goto('/translations');

    return new TranslationsPage(page);
  }

  public async assertTitleEquals(expectation: string) {
    await expect(this.page.getByTestId('translation-title')).toHaveText(expectation);
  }

  public async createGroup(name?: string) {
    const identifier = faker.datatype.uuid();
    const groupName = name ?? faker.name.lastName();
    await this.addGroupButton().click();
    await this.selectDefaultLanguage('Hindi (India)');
    await this.submitDefaultLanguageButton().click();
    await this.page.getByTestId('group-name-input').fill(groupName);
    await this.page.getByTestId('group-identifier-input').fill(identifier);
    await this.page.getByTestId('add-group-submit-btn').click();

    return { groupName, identifier };
  }
}
