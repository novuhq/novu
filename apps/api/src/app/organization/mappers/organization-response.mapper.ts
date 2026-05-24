import { IPartnerConfiguration, OrganizationEntity } from '@novu/dal';

export type OrganizationPartnerConfigurationResponse = Omit<IPartnerConfiguration, 'accessToken'>;

export type OrganizationPublicResponse = Omit<OrganizationEntity, 'partnerConfigurations'> & {
  partnerConfigurations?: OrganizationPartnerConfigurationResponse[];
};

function mapPartnerConfiguration(configuration: IPartnerConfiguration): OrganizationPartnerConfigurationResponse {
  const { accessToken: _accessToken, ...publicConfiguration } = configuration;

  return publicConfiguration;
}

export function toOrganizationPublicResponse(
  organization: OrganizationEntity | null | undefined
): OrganizationPublicResponse | null | undefined {
  if (!organization) {
    return organization;
  }

  const { partnerConfigurations, ...organizationWithoutPartnerConfigurations } = organization;

  if (!partnerConfigurations?.length) {
    return organization;
  }

  return {
    ...organizationWithoutPartnerConfigurations,
    partnerConfigurations: partnerConfigurations.map(mapPartnerConfiguration),
  };
}

export function toOrganizationPublicResponses(organizations: OrganizationEntity[]): OrganizationPublicResponse[] {
  return organizations.map((organization) => toOrganizationPublicResponse(organization) as OrganizationPublicResponse);
}
