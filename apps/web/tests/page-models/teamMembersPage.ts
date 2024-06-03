import { expect, Page } from '@playwright/test';

export class TeamMembersPage {
  constructor(private page: Page) {}

  static async goTo(page: Page): Promise<TeamMembersPage> {
    await page.goto('/settings/team');

    return new TeamMembersPage(page);
  }

  getInviteUserInputBox() {
    return this.page.getByRole('textbox', { name: 'Invite user by email' });
  }

  async inviteUserByEmail(email: string) {
    const responsePromise = this.page.waitForResponse('**/invites');
    const inputBox = this.getInviteUserInputBox();
    await expect(inputBox).toBeVisible();

    await inputBox.fill(email);
    await this.page.getByTestId('submit-btn').click();
    await responsePromise;
  }

  async removeUserFromTeam() {
    const responsePromise = this.page.waitForResponse('**/organizations/members/**');
    await this.page.getByTestId('actions-row-btn').click();
    await this.page.getByTestId('remove-row-btn').click();
    await responsePromise;
  }

  async assertNumberOfUsersInTeamMembersList(count: number) {
    const memberRows = this.page.getByTestId(/^member-row-.*$/);
    await expect(memberRows).toHaveCount(count);
  }
}
