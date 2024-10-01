import { expect } from '@playwright/test';
import { test } from './utils/baseTest';
import { AuthLoginPage } from './page-models/authLoginPage';
import { HeaderPage } from './page-models/headerPage';
import { SidebarPage } from './page-models/sidebarPage';
import { SignUpPage } from './page-models/signupPage';
import { initializeSession } from './utils/browser';
import { logout } from './utils/commands';
import { createUser, randomEmail, testPassword, inviteUser, SessionData } from './utils/plugins';

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

  // TODO: Enabling the terms and conditions checkbox doesn't enable the button in Playwright. Investigate why.
  test.skip('invite a new user to the organization', async ({ browser, page }) => {
    const inviteeEmail = randomEmail();
    const invitation = await inviteUser(session, inviteeEmail);
    await logout(page, session);

    const newContext = await browser.newContext();
    const pageForInvitedUser = await newContext.newPage();

    await pageForInvitedUser.goto(`/auth/invitation/${invitation.token}`);

    const signUpPage = new SignUpPage(pageForInvitedUser);
    await signUpPage.getFullNameLocator().fill('Invited User');
    await signUpPage.getPasswordLocator().fill(testPassword());
    await signUpPage.getAcceptTermsAndConditionsCheckMark().click();
    await signUpPage.clickSignUpButton();

    await signUpPage.assertNavigationPath('/auth/application');
    await signUpPage.fillUseCaseData();
    await signUpPage.clickGetStartedButton();

    await signUpPage.assertNavigationPath('/get-started**');

    const sidebarPage = await SidebarPage.goTo(pageForInvitedUser);
    await expect(sidebarPage.getOrganizationSwitch()).toHaveValue(new RegExp(invitation.organization.name, 'i'));
  });

  test('invite an existing user to the organization', async ({ browser, page }) => {
    const invitation = await inviteUser(session, testUser.email);
    await logout(page, session);

    const newContext = await browser.newContext();
    const pageForInvitedUser = await newContext.newPage();

    await pageForInvitedUser.goto(`/auth/invitation/${invitation.token}`);

    const loginPage = new AuthLoginPage(pageForInvitedUser);
    await expect(loginPage.getEmailLocator()).toHaveValue(testUser.email);
    await loginPage.setPasswordTo(testPassword());
    await loginPage.clickSignInButton();

    await new HeaderPage(pageForInvitedUser).clickAvatar();
    const orgSwitch = new SidebarPage(pageForInvitedUser).getOrganizationSwitch();
    await orgSwitch.focus();
    const orgOptions = orgSwitch.page().getByRole('option', { name: invitation.organization.name });
    await expect(orgOptions).toBeVisible();
  });
});
