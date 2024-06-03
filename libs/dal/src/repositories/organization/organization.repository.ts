import { IPartnerConfiguration, OrganizationDBModel, OrganizationEntity } from './organization.entity';
import { BaseRepository } from '../base-repository';
import { Organization } from './organization.schema';
import { ApiServiceLevelEnum } from '@novu/shared';
import { IOrganizationRepository } from './organization-repository.interface';
import { createOrganizationRepository } from './organization.repository.factory';

export class OrganizationRepository
  extends BaseRepository<OrganizationDBModel, OrganizationEntity, object>
  implements IOrganizationRepository
{
  private organizationRepository: IOrganizationRepository;

  constructor() {
    super(Organization, OrganizationEntity);
    this.organizationRepository = createOrganizationRepository();
  }

  async findById(id: string, select?: string): Promise<OrganizationEntity | null> {
    return this.organizationRepository.findById(id, select);
  }

  async findUserActiveOrganizations(userId: string): Promise<OrganizationEntity[]> {
    return this.organizationRepository.findUserActiveOrganizations(userId);
  }

  async updateBrandingDetails(organizationId: string, branding: { color: string; logo: string }) {
    return this.organizationRepository.updateBrandingDetails(organizationId, branding);
  }

  async renameOrganization(organizationId: string, payload: { name: string }) {
    return this.organizationRepository.renameOrganization(organizationId, payload);
  }

  async updateServiceLevel(organizationId: string, apiServiceLevel: ApiServiceLevelEnum) {
    return this.organizationRepository.updateServiceLevel(organizationId, apiServiceLevel);
  }

  async findPartnerConfigurationDetails(organizationId: string, userId: string, configurationId: string) {
    return this.organizationRepository.findPartnerConfigurationDetails(organizationId, userId, configurationId);
  }

  async updatePartnerConfiguration(organizationId: string, userId: string, configuration: IPartnerConfiguration) {
    return this.organizationRepository.updatePartnerConfiguration(organizationId, userId, configuration);
  }

  async bulkUpdatePartnerConfiguration(userId: string, data: Record<string, string[]>, configurationId: string) {
    return this.organizationRepository.bulkUpdatePartnerConfiguration(userId, data, configurationId);
  }
}
