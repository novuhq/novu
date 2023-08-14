import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRepository, MemberRepository } from '@novu/dal';
import { MemberRoleEnum } from '@novu/shared';

import { ChangeMemberRoleCommand } from './change-member-role.command';
import { ApiException } from '../../../../shared/exceptions/api.exception';

@Injectable()
export class ChangeMemberRole {
  constructor(private organizationRepository: OrganizationRepository, private memberRepository: MemberRepository) {}

  async execute(command: ChangeMemberRoleCommand) {
    if (![MemberRoleEnum.MEMBER, MemberRoleEnum.ADMIN].includes(command.role)) {
      throw new ApiException('Not supported role type');
    }

    if (command.role !== MemberRoleEnum.ADMIN) {
      throw new ApiException(`The change of role to an ${command.role} type is not supported`);
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
