import { Injectable, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository } from '@novu/dal';
import { GetOrganizationCommand } from './get-organization.command';

@Injectable()
export class GetOrganization {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async execute(command: GetOrganizationCommand) {
    const organization = await this.organizationRepository.findById(command.id);

    if (!organization?.partnerConfigurations?.length) {
      return organization;
    }

    return {
      ...organization,
      partnerConfigurations: organization.partnerConfigurations.map(({ accessToken, ...configuration }) => configuration),
    } as OrganizationEntity;
  }
}
