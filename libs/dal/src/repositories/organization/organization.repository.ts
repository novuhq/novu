import { IPartnerConfiguration, OrganizationEntity } from './organization.entity';
import { ApiServiceLevelEnum } from '@novu/shared';
import { IOrganizationRepository } from './organization-repository.interface';
import { Inject } from '@nestjs/common';

export class OrganizationRepository implements IOrganizationRepository {
  constructor(@Inject('ORGANIZATION_REPOSITORY') private organizationRepository: IOrganizationRepository) {}

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

  async create(data: any, options?: any): Promise<OrganizationEntity> {
    return this.organizationRepository.create(data, options);
  }

  async update(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.organizationRepository.update(query, body);
  }

  async delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.organizationRepository.delete(query);
  }

  async count(query: any, limit?: number): Promise<number> {
    return this.organizationRepository.count(query, limit);
  }

  async aggregate(query: any[], options?: { readPreference?: 'secondaryPreferred' | 'primary' }): Promise<any> {
    return this.organizationRepository.aggregate(query, options);
  }

  async findOne(query: any, select?: any, options?: any): Promise<OrganizationEntity | null> {
    return this.organizationRepository.findOne(query, select, options);
  }

  async find(query: any, select?: any, options?: any): Promise<OrganizationEntity[]> {
    return this.organizationRepository.find(query, select, options);
  }

  async *findBatch(
    query: any,
    select?: string | undefined,
    options?: any,
    batchSize?: number | undefined
  ): AsyncGenerator<any, any, unknown> {
    return this.organizationRepository.findBatch(query, select, options, batchSize);
  }

  async insertMany(
    data: any,
    ordered: boolean
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: any }> {
    return this.organizationRepository.insertMany(data, ordered);
  }

  async updateOne(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.organizationRepository.updateOne(query, body);
  }

  async upsertMany(data: any): Promise<any> {
    return this.organizationRepository.upsertMany(data);
  }

  async bulkWrite(bulkOperations: any, ordered: boolean): Promise<any> {
    return this.organizationRepository.bulkWrite(bulkOperations, ordered);
  }
}
