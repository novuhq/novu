import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { OrganizationRepository, UserRepository, MemberRepository } from '@novu/dal';
import { MemberStatusEnum } from '@novu/shared';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { normalizeEmail } from '../../../shared/helpers/email-normalization.service';
import { GetInviteCommand } from './get-invite.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetInvite {
  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository,
    private userRepository: UserRepository
  ) {}

  async execute(command: GetInviteCommand) {
    const invitedMember = await this.memberRepository.findByInviteToken(command.token);
    if (!invitedMember) throw new ApiException('No invite found');

    const organization = await this.organizationRepository.findById(invitedMember._organizationId);
    if (!organization) throw new NotFoundException('Organization not found');

    if (invitedMember.memberStatus !== MemberStatusEnum.INVITED) {
      throw new ApiException('Invite token expired');
    }

    if (!invitedMember.invite) throw new NotFoundException(`Invite not found`);

    const user = await this.userRepository.findById(invitedMember.invite._inviterId);
    if (!user) throw new NotFoundException('User not found');

    const invitedUser = await this.userRepository.findByEmail(normalizeEmail(invitedMember.invite.email));

    return {
      inviter: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      },
      organization: {
        _id: organization._id,
        name: organization.name,
        logo: organization.logo,
      },
      email: invitedMember.invite.email,
      _userId: invitedUser ? invitedUser._id : undefined,
    };
  }
}
