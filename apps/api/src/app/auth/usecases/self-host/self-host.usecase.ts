import { Inject, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository, MemberRepository } from '@novu/dal';
import { SwitchOrganization } from '../switch-organization/switch-organization.usecase';
import { SwitchOrganizationCommand } from '../switch-organization';

export class SelfHostUsecase {
  private readonly COMMUNITY_EDITION_NAME = 'Community Edition';

  constructor(
    @Inject('ORGANIZATION_REPOSITORY')
    private organizationRepository: CommunityOrganizationRepository,
    private memberRepository: MemberRepository,
    private readonly switchOrganizationUsecase: SwitchOrganization
  ) {}

  async execute() {
    const communityEditionOrg = await this.organizationRepository.findOne({ name: this.COMMUNITY_EDITION_NAME });

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
