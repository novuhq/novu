import { Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';

import { MemberEntity, OrganizationRepository, UserEntity, MemberRepository, UserRepository } from '@novu/dal';
import { MemberStatusEnum } from '@novu/shared';
import { Novu } from '@novu/node';
import { AuthService } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { AcceptInviteCommand } from './accept-invite.command';
import { capitalize } from '../../../shared/services/helper/helper.service';

@Injectable({
  scope: Scope.REQUEST,
})
export class AcceptInvite {
  private organizationId: string;

  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository,
    private userRepository: UserRepository,
    private authService: AuthService
  ) {}

  async execute(command: AcceptInviteCommand): Promise<string> {
    const member = await this.memberRepository.findByInviteToken(command.token);
    if (!member) throw new ApiException('No organization found');
    if (!member.invite) throw new ApiException('No active invite found for user');

    const organization = await this.organizationRepository.findById(member._organizationId);
    if (!organization) throw new NotFoundException('No organization found');

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('No user found');

    this.organizationId = organization._id;

    if (member.memberStatus !== MemberStatusEnum.INVITED) throw new ApiException('Token expired');

    const inviter = await this.userRepository.findById(member.invite._inviterId);
    if (!inviter) throw new NotFoundException('No inviter entity found');

    await this.memberRepository.convertInvitedUserToMember(this.organizationId, command.token, {
      memberStatus: MemberStatusEnum.ACTIVE,
      _userId: command.userId,
      answerDate: new Date(),
    });

    this.sendInviterAcceptedEmail(inviter, member);

    return this.authService.generateUserToken(user);
  }

  async sendInviterAcceptedEmail(inviter: UserEntity, member: MemberEntity) {
    if (!member.invite) return;

    try {
      if ((process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'production') && process.env.NOVU_API_KEY) {
        const novu = new Novu(process.env.NOVU_API_KEY);

        await novu.trigger(process.env.NOVU_TEMPLATEID_INVITE_ACCEPTED || 'invite-accepted-dEQAsKD1E', {
          to: {
            subscriberId: inviter._id,
            firstName: capitalize(inviter.firstName || ''),
            email: inviter.email || '',
          },
          payload: {
            invitedUserEmail: member.invite.email,
            firstName: capitalize(inviter.firstName || ''),
            ctaUrl: '/team',
          },
        });
      }
    } catch (e) {
      Logger.error(e.message, e.stack, 'Accept inviter send email');
    }
  }
}
