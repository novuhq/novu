import { expect, Page } from '@playwright/test';
import { test } from './utils/baseTest';
import { AuthLoginPage } from './page-models/authLoginPage';
import { HeaderPage } from './page-models/headerPage';
import { SidebarPage } from './page-models/sidebarPage';
import { SignUpPage } from './page-models/signupPage';
import { initializeSession } from './utils/browser';
import { logout } from './utils/commands';
import { createUser, randomEmail, testPassword } from './utils/plugins';
import { inviteUser, SessionData } from './utils/plugins';

let session: SessionData;

let testUser;

test.describe('Invites', () => {
  test.skip(process.env.NOVU_ENTERPRISE !== 'true', 'Skipping tests for non enterprise variant...');

  test.beforeAll(async () => {
    testUser = await createUser();
  });

  test.beforeEach(async ({ page }) => {
    const { session: newSession } = await initializeSession(page);
    session = newSession;
  });

  test('invite a new user to the organization', async ({ context, page }) => {
    const inviteeEmail = randomEmail();
    const invitation = await inviteUser(session, inviteeEmail);
    await logout(page, session);

    await page.goto(`/auth/invitation/${invitation.token}`);

    const signUpPage = new SignUpPage(page);
    await signUpPage.getFullNameLocator().fill('Invited User');
    await signUpPage.getPasswordLocator().fill(testPassword());
    await signUpPage.getAcceptTermsAndConditionsCheckMark().click();
    await signUpPage.clickSignUpButton();

    await signUpPage.assertNavigationPath('/auth/application');
    await signUpPage.fillUseCaseData();
    await signUpPage.clickGetStartedButton();

    await signUpPage.assertNavigationPath('/get-started**');

    const sidebarPage = await SidebarPage.goTo(page);
    const orgSwitchValue = (await sidebarPage.getOrganizationSwitch().inputValue()).toLowerCase();
    expect(orgSwitchValue).toBe(invitation.organization.name.toLowerCase());
  });

  test('invite an existing user to the organization', async ({ context, page }) => {
    const invitation = await inviteUser(session, testUser.email);
    await logout(page, session);

    await page.goto(`/auth/invitation/${invitation.token}`);

    const loginPage = new AuthLoginPage(page);
    await expect(loginPage.getEmailLocator()).toHaveValue(testUser.email);
    await loginPage.setPasswordTo(testPassword());
    await loginPage.clickSignInButton();

    await new HeaderPage(page).clickAvatar();
    const orgSwitch = new SidebarPage(page).getOrganizationSwitch();
    await orgSwitch.focus();
    const orgOptions = orgSwitch.page().getByRole('option', { name: invitation.organization.name });
    await expect(orgOptions).toBeVisible();
  });
});
