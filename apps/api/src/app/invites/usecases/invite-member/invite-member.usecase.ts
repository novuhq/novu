import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { OrganizationRepository, UserRepository, MemberRepository, IAddMemberData } from '@novu/dal';
import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { Novu } from '@novu/node';
import { AnalyticsService } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { InviteMemberCommand } from './invite-member.command';
import { capitalize, createGuid } from '../../../shared/services/helper/helper.service';

@Injectable({
  scope: Scope.REQUEST,
})
export class InviteMember {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: InviteMemberCommand) {
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new ApiException('No organization found');

    const foundInvitee = await this.memberRepository.findInviteeByEmail(organization._id, command.email);

    if (foundInvitee) throw new ApiException('Already invited');

    const inviterUser = await this.userRepository.findById(command.userId);
    if (!inviterUser) throw new NotFoundException(`Inviter ${command.userId} is not found`);

    const token = createGuid();

    if (process.env.NOVU_API_KEY && (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'production')) {
      const novu = new Novu(process.env.NOVU_API_KEY);

      // cspell:disable-next
      await novu.trigger(process.env.NOVU_TEMPLATEID_INVITE_TO_ORGANISATION || 'invite-to-organization-wBnO8NpDn', {
        to: {
          subscriberId: command.email,
          email: command.email,
        },
        payload: {
          email: command.email,
          inviteeName: capitalize(command.email.split('@')[0]),
          organizationName: capitalize(organization.name),
          inviterName: capitalize(inviterUser.firstName ?? ''),
          acceptInviteUrl: `${process.env.FRONT_BASE_URL}/auth/invitation/${token}`,
        },
      });
    }

    const memberPayload: IAddMemberData = {
      roles: [command.role as MemberRoleEnum],
      memberStatus: MemberStatusEnum.INVITED,
      invite: {
        token,
        _inviterId: command.userId,
        email: command.email,
        invitationDate: new Date(),
      },
    };

    this.analyticsService.track('Invite Organization Member', command.userId, {
      _organization: command.organizationId,
      role: command.role,
    });

    await this.memberRepository.addMember(organization._id, memberPayload);
  }
}
