import { BadRequestException, Injectable, Scope } from '@nestjs/common';
import { Novu } from '@novu/api';
import { MemberRepository, OrganizationRepository, UserRepository } from '@novu/dal';
import { MemberStatusEnum } from '@novu/shared';
import { capitalize, createGuid } from '../../../shared/services/helper/helper.service';
import { ResendInviteCommand } from './resend-invite.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class ResendInvite {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: ResendInviteCommand) {
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new BadRequestException('No organization found');

    const foundInvitee = await this.memberRepository.findOne({
      _id: command.memberId,
      _organizationId: command.organizationId,
    });
    if (!foundInvitee) throw new BadRequestException('Member not found');
    if (foundInvitee.memberStatus !== MemberStatusEnum.INVITED) throw new BadRequestException('Member already active');
    if (!foundInvitee.invite) throw new BadRequestException('Invited user is not found');

    const inviterUser = await this.userRepository.findById(command.userId);
    if (!inviterUser) throw new BadRequestException('Inviter is not found');

    const token = createGuid();

    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'production') {
      const novu = new Novu({ security: { secretKey: process.env.NOVU_API_KEY } });

      // cspell:disable-next
      await novu.trigger({
        workflowId: process.env.NOVU_TEMPLATEID_INVITE_TO_ORGANISATION || 'invite-to-organization-wBnO8NpDn',
        to: [
          {
            subscriberId: foundInvitee.invite.email,
            email: foundInvitee.invite.email,
          },
        ],
        payload: {
          email: foundInvitee.invite.email,
          inviteeName: capitalize(foundInvitee.invite.email.split('@')[0]),
          organizationName: capitalize(organization.name),
          inviterName: capitalize(inviterUser.firstName ?? ''),
          acceptInviteUrl: `${process.env.FRONT_BASE_URL}/auth/invitation/${token}`,
        },
      });
    }

    await this.memberRepository.update(foundInvitee, {
      memberStatus: MemberStatusEnum.INVITED,
      invite: {
        token,
        _inviterId: command.userId,
        invitationDate: new Date(),
      },
    });
  }
}
