import { Injectable, Scope } from '@nestjs/common';
import { OrganizationRepository, UserRepository, MemberRepository } from '@notifire/dal';
import { MemberRoleEnum, MemberStatusEnum } from '@notifire/shared';
import { Notifire } from '@notifire/node';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { InviteMemberCommand } from './invite-member.command';
import { MailService } from '../../../shared/services/mail/mail.service';
import { capitalize, createGuid } from '../../../shared/services/helper/helper.service';

@Injectable({
  scope: Scope.REQUEST,
})
export class InviteMember {
  constructor(
    private organizationRepository: OrganizationRepository,
    private mailService: MailService,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: InviteMemberCommand) {
    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new ApiException('No organization found');

    const foundInvitee = await this.memberRepository.findInviteeByEmail(organization._id, command.email);

    if (foundInvitee) throw new ApiException('Already invited');

    const inviterUser = await this.userRepository.findById(command.userId);

    const token = createGuid();

    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'prod') {
      const notifire = new Notifire(process.env.NOTIFIRE_API_KEY);
      await notifire.trigger('invite-to-organization-qUE8d-GRq', {
        $user_id: command.email,
        $email: command.email,
        inviteeName: capitalize(command.email.split('@')[0]),
        organizationName: capitalize(organization.name),
        inviterName: capitalize(inviterUser.firstName),
        acceptInviteUrl: `${process.env.FRONT_BASE_URL}/auth/invitation/${token}`,
      });
    }

    await this.memberRepository.addMember(organization._id, {
      roles: [command.role],
      memberStatus: MemberStatusEnum.INVITED,
      invite: {
        token,
        _inviterId: command.userId,
        email: command.email,
        invitationDate: new Date(),
      },
    });
  }
}
