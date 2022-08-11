import { Injectable } from '@nestjs/common';
import { OrganizationRepository, UserRepository, MemberRepository } from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';
import { ChangeMemberRoleCommand } from './change-member-role.command';
import { ApiException } from '../../../../shared/exceptions/api.exception';

@Injectable()
export class ChangeMemberRole {
  constructor(
    private organizationRepository: OrganizationRepository,
    private userRepository: UserRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: ChangeMemberRoleCommand) {
    const organization = await this.organizationRepository.findById(command.organizationId);
    const user = await this.userRepository.findById(command.userId);

    const member = await this.memberRepository.findMemberById(organization._id, command.memberId);
    if (!member) throw new ApiException('No member was found');

    if (![MemberRoleEnum.MEMBER, MemberRoleEnum.ADMIN].includes(command.role)) {
      throw new ApiException('Not supported role type');
    }

    const roles = [command.role];

    await this.memberRepository.updateMemberRoles(organization._id, command.memberId, roles);

    return this.memberRepository.findMemberByUserId(organization._id, member._userId);
  }
}
