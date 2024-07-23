import { expect } from '@playwright/test';

import { OrganizationEntity, UserEntity } from '@novu/dal';

import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { HeaderPage } from './page-models/headerPage';
import { SessionData } from './utils/plugins';

let user: UserEntity;
let organization: OrganizationEntity;
let session: SessionData;

test.beforeEach(async ({ page }) => {
  ({ session } = await initializeSession(page, { noTemplates: true }));
  user = session.user;
  organization = session.organization;
});

test('should display correct user photo', async ({ page }) => {
  const headerPage = await HeaderPage.goTo(page);
  const avatarImage = await headerPage.getAvatarImageSrc();
  expect(avatarImage).toBe(user.profilePicture);
});

test('should display user name in dropdown', async ({ page }) => {
  const headerPage = await HeaderPage.goTo(page);
  await headerPage.clickAvatar();
  const username = await headerPage.getUserName();
  expect(username).toContain(user.firstName);
  expect(username).toContain(user.lastName);
});

test('should display organization name in dropdown', async ({ page }) => {
  const headerPage = await HeaderPage.goTo(page);
  await headerPage.clickAvatar();
  expect(await headerPage.getOrganizationName()).toContain(organization.name);
});

test('logout user successfully', async ({ page }) => {
  const headerPage = await HeaderPage.goTo(page);
  await headerPage.clickAvatar();
  await headerPage.clickLogout();
  expect(page.url()).toContain('/auth/login');
  expect(await page.evaluate(() => localStorage.getItem('nv_auth_token'))).toBeNull();
});
