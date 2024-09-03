import { expect, Locator, Page, selectors } from '@playwright/test';
import os from 'node:os';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { getSession, ISessionOptions } from './plugins';

const isMac = os.platform() === 'darwin';
const modifier = isMac ? 'Meta' : 'Control';

export async function initializeSession(page: Page, settings: ISessionOptions = {}) {
  selectors.setTestIdAttribute('data-test-id');

  const session = await getSession(settings);

  /*
   * Why is this necessary?
   *
   * Most Playwright tests, create a sessions using some utility functions. The session
   * is injected in the test, but also needs to be injected in the browser storage, so that
   * the app can work as expected. Currently, the apps shares token and environment information
   * between React hooks and the api.client.ts via the localStorage. This needs to be revised
   * in favor of an in-memory approach.
   */
  await page.addInitScript((currentSession) => {
    window.addEventListener('DOMContentLoaded', () => {
      localStorage.setItem('nv_auth_token', currentSession.token);
      localStorage.setItem('nv_last_environment_id', currentSession.environment._id);
    });
  }, session);

  // TODO: Remove the first navigation from this function and move it per test to have more control per test
  await page.goto('/');

  return { session };
}

export async function fillTextInAMonacoEditor(page: Page, selector: string, textToType: string) {
  const monacoEditor = page.locator(selector).nth(0);
  await monacoEditor.click();
  await monacoEditor.press(`${modifier}+KeyX`);
  await page.keyboard.type(textToType);
}

export async function fillTextInAMonacoEditorLocator(locator: Locator, textToType: string) {
  await locator.click();
  await locator.page().keyboard.type(textToType);
}

export async function dragAndDrop(dragSelector: Locator, dropSelector: Locator) {
  await dragSelector.dragTo(dropSelector, { force: true });
}

export async function deleteIndexedDB(page: Page, dbName: string) {
  await page.goto('/');
  await page.evaluate((name) => {
    indexedDB.deleteDatabase(name);
  }, dbName);
}

export async function isDarkTheme(page: Page) {
  // TODO: there should be a more idiomatic way to find out what theme is selected
  const backgroundColor = await page.evaluate(() => {
    const { body } = document;

    return window.getComputedStyle(body).backgroundColor;
  });

  return backgroundColor.toLowerCase() === 'rgb(30, 30, 38)';
}

export async function getAttByTestId(page: Page, testId: string, att: string) {
  return await page.getByTestId(testId).getAttribute(att);
}
export async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

export async function setBrowserDateTimeTo(page: Page, value: Date) {
  await page.addInitScript(`{
    // Extend Date constructor to default to [value]
    Date = class extends Date {
      constructor(...args) {
        if (args.length === 0) {
          super(${value});
        } else {
          super(...args);
        }
      }
    }
    // Override Date.now() to start from [value]
    const __DateNowOffset = ${value} - Date.now();
    const __DateNow = Date.now;
    Date.now = () => __DateNow() + __DateNowOffset;
  }`);
}

export async function assertPageShowsMessage(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible();
}

declare global {
  interface Window {
    _env_: Record<string, string | undefined>;
  }
}

export async function setFeatureFlag(page: Page, key: FeatureFlagsKeysEnum, value: string | boolean) {
  await page.addInitScript(
    ({ k, v }) => {
      window._env_ = window._env_ || { [k]: v.toString() };
    },
    { k: key, v: value }
  );
}
