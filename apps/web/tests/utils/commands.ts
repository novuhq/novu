import { expect, Locator, Page } from '@playwright/test';
import { ConditionsPage } from '../page-models/conditionsPage';

export async function logout(page: Page, settings = {}) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('nv_auth_token');
    localStorage.removeItem('nv_last_environment_id');
  });
}

export function getClipboardValue(page: Page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

export async function setFileForFilePicker(locator: Locator, filePath: string) {
  const fileChooserPromise = locator.page().waitForEvent('filechooser');
  await locator.dispatchEvent('click');
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
}

export async function addConditions(page: Page) {
  const conditionsModal = new ConditionsPage(page);
  await conditionsModal.getAddNewConditionButton().click();
  await conditionsModal.getConditionsFormKeyInput().fill('test');
  await conditionsModal.getConditionsFormValueInput().fill('test');
  await conditionsModal.getApplyConditionsButton().click();
}
