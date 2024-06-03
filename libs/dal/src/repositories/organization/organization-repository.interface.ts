import { IPartnerConfiguration, OrganizationEntity } from './organization.entity';
import { ApiServiceLevelEnum } from '@novu/shared';

export interface IOrganizationRepository {
  findById(id: string, select?: string): Promise<OrganizationEntity | null>;
  findUserActiveOrganizations(userId: string): Promise<OrganizationEntity[]>;
  updateBrandingDetails(
    organizationId: string,
    branding: { color: string; logo: string }
  ): Promise<{
    matched: number;
    modified: number;
  }>;
  renameOrganization(
    organizationId: string,
    payload: { name: string }
  ): Promise<{
    matched: number;
    modified: number;
  }>;
  updateServiceLevel(
    organizationId: string,
    apiServiceLevel: ApiServiceLevelEnum
  ): Promise<{
    matched: number;
    modified: number;
  }>;
  findPartnerConfigurationDetails(
    organizationId: string,
    userId: string,
    configurationId: string
  ): Promise<OrganizationEntity[]>;
  updatePartnerConfiguration(
    organizationId: string,
    userId: string,
    configuration: IPartnerConfiguration
  ): Promise<{
    matched: number;
    modified: number;
  }>;
  bulkUpdatePartnerConfiguration(userId: string, data: Record<string, string[]>, configurationId: string): Promise<any>;
}
