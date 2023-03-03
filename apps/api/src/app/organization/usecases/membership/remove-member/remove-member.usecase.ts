import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { OrganizationRepository, MemberRepository, EnvironmentRepository } from '@novu/dal';
import { RemoveMemberCommand } from './remove-member.command';
import { ApiException } from '../../../../shared/exceptions/api.exception';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveMember {
  constructor(
    private organizationRepository: OrganizationRepository,
    private memberRepository: MemberRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: RemoveMemberCommand) {
    const members = await this.memberRepository.getOrganizationMembers(command.organizationId);
    const memberToRemove = members.find((i) => i._id === command.memberId);

    if (!memberToRemove) throw new NotFoundException('Member not found');
    if (memberToRemove._userId && memberToRemove._userId && memberToRemove._userId === command.userId) {
      throw new ApiException('Cannot remove self from members');
    }

    await this.memberRepository.removeMemberById(command.organizationId, memberToRemove._id);
    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);
    const isMemberAssociatedWithEnvironment = environments.some((i) =>
      i.apiKeys.some((key) => key._userId === memberToRemove._userId)
    );

    if (isMemberAssociatedWithEnvironment) {
      const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
      if (!admin) throw new NotFoundException('No admin account found for organization');

      await this.environmentRepository.updateApiKeyUserId(
        command.organizationId,
        memberToRemove._userId,
        admin._userId
      );
    }

    return memberToRemove;
  }
}
