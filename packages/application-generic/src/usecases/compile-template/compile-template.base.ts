import { OrganizationEntity, OrganizationRepository } from '@novu/dal';
import { ModuleRef } from '@nestjs/core';
import { NotFoundException } from '@nestjs/common';

export abstract class CompileTemplateBase {
  protected constructor(
    protected organizationRepository: OrganizationRepository,
    protected moduleRef: ModuleRef
  ) {}

  protected async getOrganization(
    organizationId: string
  ): Promise<OrganizationEntity | undefined> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      'branding defaultLocale'
    );

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return organization;
  }
}
