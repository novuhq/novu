import { expect } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { initializeSession, isLoginPage } from './utils.ts/browser';
import { HeaderPage } from './page-models/headerPage';
import { validateTokenNotExisting } from './utils.ts/authUtils';
import { OrganizationEntity, UserEntity } from '@novu/dal/src';
import { FeatureFlagsMock } from './utils.ts/featureFlagsMock';
import { SessionData } from './utils.ts/plugins';

test.describe('App Header', () => {
  let user: UserEntity;
  let organization: OrganizationEntity;
  let featureFlagsMock: FeatureFlagsMock, session: SessionData;

  test.beforeEach(async ({ page }) => {
    ({ featureFlagsMock, session } = await initializeSession(page, { noTemplates: true }));
    featureFlagsMock.setFlagsToMock({
      IS_IMPROVED_ONBOARDING_ENABLED: false,
      IS_INFORMATION_ARCHITECTURE_ENABLED: true,
      IS_TEMPLATE_STORE_ENABLED: false,
    });
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
    const orgName = await headerPage.getOrganizationName().textContent();
    expect(orgName.toLowerCase()).toContain(organization.name.toLowerCase());
  });

  test('logout user successfully', async ({ page }) => {
    const headerPage = await HeaderPage.goTo(page);
    await headerPage.clickAvatar();
    await headerPage.clickLogout();
    isLoginPage(page);
    await validateTokenNotExisting(page);
    await page.goto('/');
    await validateTokenNotExisting(page);
    isLoginPage(page);
  });
});
