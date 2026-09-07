import { NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CommunityOrganizationRepository, OrganizationEntity } from '@novu/dal';

export abstract class CompileTemplateBase {
  protected constructor(
    protected communityOrganizationRepository: CommunityOrganizationRepository,
    protected moduleRef: ModuleRef
  ) {}

  protected async getOrganization(organizationId: string): Promise<OrganizationEntity | undefined> {
    const organization = await this.communityOrganizationRepository.findById(organizationId, 'branding defaultLocale');

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return organization;
  }
}
