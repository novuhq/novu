import { BrowserContext, Locator, Page } from '@playwright/test';

import { getSession, ISessionOptions } from './plugins';

export async function initializeSession(context: BrowserContext, settings: ISessionOptions = {}) {
  const session = await getSession(settings);

  await context.addInitScript((session) => {
    (window as any).isPlaywright = true;
    localStorage.setItem('auth_token', session.token);
  }, session);

  return session;
}

export function getByTestId(page: Page | Locator, selector: string, options?: Parameters<Page['locator']>[1]) {
  return page.locator(`[data-test-id="${selector}"]`, options);
}

export async function dragAndDrop(page: Page, dragSelector: string, dropSelector: string) {
  const dndEl = await getByTestId(page, dragSelector);
  await dndEl.dragTo(await getByTestId(page, dropSelector), { force: true });
}

export async function isDarkTheme(page: Page) {
  const backgroundColor = await page.evaluate(() => {
    const body = document.body;
    return window.getComputedStyle(body).backgroundColor;
  });
  return backgroundColor.toLowerCase() !== '#EDF0F2' && backgroundColor.toLowerCase() !== 'rgb(237, 240, 242)';
}
