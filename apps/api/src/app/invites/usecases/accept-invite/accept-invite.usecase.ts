import { Injectable, NotFoundException, Scope, BadRequestException } from '@nestjs/common';

import { MemberEntity, MemberRepository, OrganizationRepository, UserEntity, UserRepository } from '@novu/dal';
import { MemberStatusEnum } from '@novu/shared';

import { PinoLogger } from '@novu/application-generic';
import { AuthService } from '../../../auth/services/auth.service';
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
    private authService: AuthService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: AcceptInviteCommand): Promise<string> {
    const member = await this.memberRepository.findByInviteToken(command.token);
    if (!member) throw new BadRequestException('No organization found');
    if (!member.invite) throw new BadRequestException('No active invite found for user');

    const organization = await this.organizationRepository.findById(member._organizationId);
    if (!organization) throw new NotFoundException('No organization found');

    const user = await this.userRepository.findById(command.userId);
    if (!user) throw new NotFoundException('No user found');

    this.organizationId = organization._id;

    if (member.memberStatus !== MemberStatusEnum.INVITED) throw new BadRequestException('Token expired');

    const inviter = await this.userRepository.findById(member.invite._inviterId);
    if (!inviter) throw new NotFoundException('No inviter entity found');

    await this.memberRepository.convertInvitedUserToMember(this.organizationId, command.token, {
      memberStatus: MemberStatusEnum.ACTIVE,
      _userId: command.userId,
      answerDate: new Date(),
    });

    await this.sendInviterAcceptedEmail(inviter, member);

    return this.authService.generateUserToken(user);
  }

  async sendInviterAcceptedEmail(inviter: UserEntity, member: MemberEntity) {
    console.log('sendInviterAcceptedEmail', { inviter, member });
  }
}
