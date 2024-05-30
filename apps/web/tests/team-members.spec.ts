import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';
import { TeamMembersPage } from './page-models/teamMembersPage';

test.beforeEach(async ({ page }) => {
  const { featureFlagsMock } = await initializeSession(page);
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_BILLING_REVERSE_TRIAL_ENABLED: false,
    IS_TEMPLATE_STORE_ENABLED: false,
    IS_BILLING_ENABLED: false,
  });
});

test('invite user by email', async ({ page }) => {
  const teamMembersPage = await TeamMembersPage.goTo(page);
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(1);
  await teamMembersPage.inviteUserByEmail('test@test.com');
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(2);
});

test('remove user from team', async ({ page }) => {
  const teamMembersPage = await TeamMembersPage.goTo(page);
  await teamMembersPage.inviteUserByEmail('test@test.com');

  await teamMembersPage.assertNumberOfUsersInTeamMembersList(2);
  await teamMembersPage.removeUserFromTeam();
  await page.waitForTimeout(300);
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(1);
});
