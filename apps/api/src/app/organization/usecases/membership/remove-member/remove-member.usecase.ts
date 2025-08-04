import { BadRequestException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { EnvironmentRepository, MemberRepository } from '@novu/dal';
import { RemoveMemberCommand } from './remove-member.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveMember {
  constructor(
    private memberRepository: MemberRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: RemoveMemberCommand) {
    const members = await this.memberRepository.getOrganizationMembers(command.organizationId);
    const memberToRemove = members.find((i) => i._id === command.memberId);

    if (!memberToRemove) throw new NotFoundException('Member not found');
    if (memberToRemove._userId && memberToRemove._userId && memberToRemove._userId === command.userId) {
      throw new BadRequestException('Cannot remove self from members');
    }

    await this.memberRepository.removeMemberById(command.organizationId, memberToRemove._id);
    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);
    const isMemberAssociatedWithEnvironment = environments.some((i) =>
      i.apiKeys.some((key) => key._userId === memberToRemove._userId)
    );

    if (isMemberAssociatedWithEnvironment) {
      const owner = await this.memberRepository.getOrganizationOwnerAccount(command.organizationId);
      if (!owner) throw new NotFoundException('No owner account found for organization');

      await this.environmentRepository.updateApiKeyUserId(
        command.organizationId,
        memberToRemove._userId,
        owner._userId
      );
    }

    return memberToRemove;
  }
}
