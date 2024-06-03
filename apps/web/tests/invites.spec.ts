import { expect, Page } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { AuthLoginPage } from './page-models/authLoginPage';
import { HeaderPage } from './page-models/headerPage';
import { SidebarPage } from './page-models/sidebarPage';
import { SignUpPage } from './page-models/signupPage';
import { initializeSession } from './utils.ts/browser';
import { logout } from './utils.ts/commands';
import { dropDatabase, inviteUser, SessionData } from './utils.ts/plugins';

test.describe.configure({ mode: 'serial' });

export const TestUserConstants = {
  Email: 'testing-amazing@user.com',
  Password: 'asd#Faf4fd',
};

let session: SessionData;

test.beforeEach(async ({ page }) => {
  await dropDatabase();
  const { featureFlagsMock, session: newSession } = await initializeSession(page);
  session = newSession;
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_HUBSPOT_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_BILLING_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

// This is flaky in Github actions but passeslocally
test('invite a new user to the organization', async ({ context, page }) => {
  const newSession = await inviteUser(session, TestUserConstants.Email);
  await logout(page, session);
  await registerFromInvitation(page, newSession.token);

  /*
   * const headerPage = await HeaderPage.goTo(page);
   * await headerPage.clickAvatar();
   * const orgName = headerPage.getOrganizationName();
   * expect(orgName).toContainText(newSession.organization.name, { ignoreCase: true });
   */

  const sidebarPage = await SidebarPage.goTo(page);
  const orgSwitchValue = (await sidebarPage.getOrganizationSwitch().inputValue()).toLowerCase();
  expect(orgSwitchValue).toBe(newSession.organization.name.toLowerCase());
});

test.skip('invite an existing user to the organization', async ({ context, page }) => {
  const newUserOne = await inviteUser(session, TestUserConstants.Email);
  await logout(page, session);
  await registerFromInvitation(page, newUserOne.token);

  const { session: newSession } = await initializeSession(page, {
    overrideSessionOptions: { page, singleTokenInjection: true },
  });
  const newUserTwo = await inviteUser(newSession, TestUserConstants.Email);
  await logout(page, session);
  await page.goto(`/auth/invitation/${newUserTwo.token}`);

  const loginPage = new AuthLoginPage(page);
  await expect(loginPage.getEmailLocator()).toHaveValue(TestUserConstants.Email);
  await loginPage.setPasswordTo('asd#Faf4fd');
  await loginPage.clickSignInButton();

  await new HeaderPage(page).clickAvatar();
  const orgSwitch = new SidebarPage(page).getOrganizationSwitch();
  await orgSwitch.focus();
  const orgOptions = orgSwitch.page().getByRole('option', { name: newUserTwo.organization.name });
  await expect(orgOptions).toBeVisible();
});

async function registerFromInvitation(page: Page, token: string) {
  await page.goto(`/auth/invitation/${token}`);
  const singUpPage = new SignUpPage(page);
  await singUpPage.getFullNameLocator().fill('Invited User');
  await singUpPage.getPasswordLocator().fill(TestUserConstants.Password);
  await singUpPage.getAcceptTermsAndConditionsCheckMark().click();
  await singUpPage.clickSignUpButton();
  await expect(page).toHaveURL(/\/workflows/);
}
