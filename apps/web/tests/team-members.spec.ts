import { test } from './utils/baseTest';
import { initializeSession } from './utils/browser';
import { TeamMembersPage } from './page-models/teamMembersPage';

test.beforeEach(async ({ page }) => {
  await initializeSession(page);
});

test('invite a member to the organization and then remove them', async ({ page }) => {
  const teamMembersPage = await TeamMembersPage.goTo(page);
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(1);

  await teamMembersPage.inviteUserByEmail('test@test.com');
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(2);

  await teamMembersPage.removeUserFromTeam();
  await teamMembersPage.assertNumberOfUsersInTeamMembersList(1);
});
