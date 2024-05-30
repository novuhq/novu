import { expect, Page } from '@playwright/test';
import { test } from './utils.ts/baseTest';
import { AuthLoginPage } from './page-models/authLoginPage';
import { HeaderPage } from './page-models/headerPage';
import { SidebarPage } from './page-models/sidebarPage';
import { SignUpPage } from './page-models/signupPage';
import { validateTokenNotExisting } from './utils.ts/authUtils';
import { initializeSession } from './utils.ts/browser';
import { logout } from './utils.ts/commands';
import { clearDatabase, inviteUser, SessionData } from './utils.ts/plugins';

export const TestUserConstants = {
  Email: 'testing-amazing@user.com',
  Password: 'asd#Faf4fd',
};

let session: SessionData;

test.beforeEach(async ({ page }) => {
  await clearDatabase();
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

test('should accept invite to organization', async ({ context, page }) => {
  const newSession = await inviteUser(session, TestUserConstants.Email);
  await logout(page, session);
  await doRegisterFromInvite(page, newSession.token);

  const headerPage = await HeaderPage.goTo(page);
  await headerPage.clickAvatar();
  const orgName = headerPage.getOrganizationName();
  expect(orgName).toContainText(newSession.organization.name, { ignoreCase: true });
});

test.skip('TODO - should allow to login if invited new user', async ({ context, page }) => {
  const newUserOne = await inviteUser(session, TestUserConstants.Email);
  await logout(page, session);
  await doRegisterFromInvite(page, newUserOne.token);

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

test.skip('TODO - should also accept invite if already logged in with right user', async ({ context, page }) => {
  const newUserOne = await inviteUser(session, TestUserConstants.Email);
  await logout(page, session);
  await doRegisterFromInvite(page, newUserOne.token);

  const { session: newSession } = await initializeSession(page, {
    overrideSessionOptions: { page, singleTokenInjection: true },
  });
  const newUserTwo = await inviteUser(newSession, TestUserConstants.Email);
  await logout(page, session);

  const loginPage = await AuthLoginPage.goTo(page);
  await loginPage.fillLoginForm({ email: TestUserConstants.Email, password: TestUserConstants.Password });
  await loginPage.clickSignInButton();
  await expect(page).toHaveURL(/\/workflows/);

  await page.goto(`/auth/invitation/${newUserTwo.token}`);

  await new HeaderPage(page).clickAvatar();
  const orgSwitch = new SidebarPage(page).getOrganizationSwitch();
  await orgSwitch.focus();
  const orgOptions = orgSwitch.page().getByRole('option', { name: newUserTwo.organization.name });
  await expect(orgOptions).toBeVisible();
});

test.skip('TODO - should redirect to invitation page again if invitation open with an active user session', async ({
  page,
}) => {
  const newUser = await inviteUser(session, TestUserConstants.Email);
  await page.goto(`/auth/invitation/${newUser.token}`);
  await page.getByTestId('success-screen-reset').click();
  await validateTokenNotExisting(page);
  await expect(page).toHaveURL(`/auth/invitation/${newUser.token}`);
});

async function doRegisterFromInvite(page: Page, token: string) {
  await page.goto(`/auth/invitation/${token}`);
  const singUpPage = new SignUpPage(page);
  await singUpPage.getFullNameLocator().fill('Invited User');
  await singUpPage.getPasswordLocator().fill(TestUserConstants.Password);
  await singUpPage.getAcceptTermsAndConditionsCheckMark().click();
  await singUpPage.clickSignUpButton();
  await expect(page).toHaveURL(/\/workflows/);
}
