import { Inject, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository, MemberRepository } from '@novu/dal';
import { SwitchOrganization } from '../switch-organization/switch-organization.usecase';
import { SwitchOrganizationCommand } from '../switch-organization';
import { getSelfHostedFindQuery } from '../../../shared/helpers/self-hosted';

export class SelfHostUsecase {
  constructor(
    @Inject('ORGANIZATION_REPOSITORY')
    private organizationRepository: CommunityOrganizationRepository,
    private memberRepository: MemberRepository,
    private readonly switchOrganizationUsecase: SwitchOrganization
  ) {}

  async execute() {
    const communityEditionOrg = await this.organizationRepository.findOne(getSelfHostedFindQuery());

    if (!communityEditionOrg) {
      throw new NotFoundException('Community Edition not found');
    }

    const users = await this.memberRepository.getOrganizationMembers(communityEditionOrg._id);

    if (!users || users.length === 0) {
      throw new NotFoundException('No admin users found for Community Edition');
    }

    const token = await this.switchOrganizationUsecase.execute(
      SwitchOrganizationCommand.create({
        newOrganizationId: communityEditionOrg._id!,
        userId: users[0]._userId,
      })
    );

    return { token };
  }
}
