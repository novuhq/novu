import { test } from './utils.ts/baseTest';
import { initializeSession } from './utils.ts/browser';
import { TeamMembersPage } from './page-models/teamMembersPage';

test.beforeEach(async ({ page }) => {
  const { featureFlagsMock } = await initializeSession(page);
  featureFlagsMock.setFlagsToMock({
    IS_IMPROVED_ONBOARDING_ENABLED: false,
    IS_INFORMATION_ARCHITECTURE_ENABLED: true,
    IS_TEMPLATE_STORE_ENABLED: false,
  });
});

test('invite a member to the organization and then remove them', async ({ page }) => {
  const teamMembersPage = await TeamMembersPage.goTo(page);
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(1);

  await teamMembersPage.inviteUserByEmail('test@test.com');
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(2);

  await teamMembersPage.removeUserFromTeam();
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(1);
});
