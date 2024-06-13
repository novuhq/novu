import { expect, Page } from '@playwright/test';

export async function validateTokenNotExisting(page: Page) {
  const authToken = await getAuthToken(page);
  expect(authToken).toBeNull();

  return authToken;
}

export function getAuthToken(page: Page) {
  return page.evaluate(() => localStorage.getItem('auth_token'));
}
