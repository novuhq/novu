import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRepository, OrganizationRepository } from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';

import { ChangeMemberRoleCommand } from './change-member-role.command';

@Injectable()
export class ChangeMemberRole {
  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: ChangeMemberRoleCommand) {
    if (![MemberRoleEnum.OSS_MEMBER, MemberRoleEnum.OSS_ADMIN].includes(command.role)) {
      throw new BadRequestException('Not supported role type');
    }

    if (command.role !== MemberRoleEnum.OSS_ADMIN) {
      throw new BadRequestException(`The change of role to an ${command.role} type is not supported`);
    }

    const organization = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new NotFoundException('No organization was found');

    const member = await this.memberRepository.findMemberById(organization._id, command.memberId);
    if (!member) throw new NotFoundException('No member was found');

    const roles = [command.role];

    await this.memberRepository.updateMemberRoles(organization._id, command.memberId, roles);

    return this.memberRepository.findMemberByUserId(organization._id, member._userId);
  }
}
