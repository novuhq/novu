import * as Sentry from '@sentry/node';
import { Injectable, Logger, Scope } from '@nestjs/common';
import { MemberRoleEnum } from '@novu/shared';
import { InviteMemberCommand } from '../invite-member/invite-member.command';
import { InviteMember } from '../invite-member/invite-member.usecase';
import { BulkInviteCommand } from './bulk-invite.command';

interface IBulkInviteResponse {
  success: boolean;
  email: string;
  failReason?: string;
}

@Injectable({
  scope: Scope.REQUEST,
})
export class BulkInvite {
  constructor(private inviteMemberUsecase: InviteMember) {}

  async execute(command: BulkInviteCommand): Promise<IBulkInviteResponse[]> {
    const invites: IBulkInviteResponse[] = [];

    for (const invitee of command.invitees) {
      try {
        await this.inviteMemberUsecase.execute(
          InviteMemberCommand.create({
            email: invitee.email,
            role: MemberRoleEnum.ADMIN,
            organizationId: command.organizationId,
            userId: command.userId,
          })
        );

        invites.push({
          success: true,
          email: invitee.email,
        });
      } catch (e) {
        if (e.message.includes('Already invited')) {
          invites.push({
            failReason: 'Already invited',
            success: false,
            email: invitee.email,
          });
        } else {
          Logger.error(e);
          Sentry.captureException(e);
          invites.push({
            success: false,
            email: invitee.email,
          });
        }
      }
    }

    return invites;
  }
}
