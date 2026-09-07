import { Injectable, Scope } from '@nestjs/common';
import { OrganizationEntity, OrganizationRepository } from '@novu/dal';
import { GetOrganizationsCommand } from './get-organizations.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetOrganizations {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async execute(command: GetOrganizationsCommand) {
    const organizations = await this.organizationRepository.findUserActiveOrganizations(command.userId);

    return organizations.map((organization) => {
      if (!organization.partnerConfigurations?.length) {
        return organization;
      }

      return {
        ...organization,
        partnerConfigurations: organization.partnerConfigurations.map(
          ({ accessToken, ...configuration }) => configuration
        ),
      } as OrganizationEntity;
    });
  }
}
