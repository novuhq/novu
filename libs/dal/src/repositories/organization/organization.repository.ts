import { ApiServiceLevelEnum } from '@novu/shared';
import { Inject } from '@nestjs/common';
import { IPartnerConfiguration, OrganizationEntity } from './organization.entity';
import { IOrganizationRepository } from './organization-repository.interface';

export class OrganizationRepository implements IOrganizationRepository {
  constructor(@Inject('ORGANIZATION_REPOSITORY') private organizationRepository: IOrganizationRepository) {}

  findById(id: string, select?: string): Promise<OrganizationEntity | null> {
    return this.organizationRepository.findById(id, select);
  }

  findUserActiveOrganizations(userId: string): Promise<OrganizationEntity[]> {
    return this.organizationRepository.findUserActiveOrganizations(userId);
  }

  updateBrandingDetails(organizationId: string, branding: { color: string; logo: string }) {
    return this.organizationRepository.updateBrandingDetails(organizationId, branding);
  }

  renameOrganization(organizationId: string, payload: { name: string }) {
    return this.organizationRepository.renameOrganization(organizationId, payload);
  }

  updateDefaultLocale(organizationId: string, defaultLocale: string): Promise<{ matched: number; modified: number }> {
    return this.organizationRepository.updateDefaultLocale(organizationId, defaultLocale);
  }

  findPartnerConfigurationDetails(organizationId: string, userId: string, configurationId: string) {
    return this.organizationRepository.findPartnerConfigurationDetails(organizationId, userId, configurationId);
  }

  updatePartnerConfiguration(organizationId: string, userId: string, configuration: IPartnerConfiguration) {
    return this.organizationRepository.updatePartnerConfiguration(organizationId, userId, configuration);
  }

  bulkUpdatePartnerConfiguration(userId: string, data: Record<string, string[]>, configurationId: string) {
    return this.organizationRepository.bulkUpdatePartnerConfiguration(userId, data, configurationId);
  }

  create(data: any, options?: any): Promise<OrganizationEntity> {
    return this.organizationRepository.create(data, options);
  }

  update(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.organizationRepository.update(query, body);
  }

  delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.organizationRepository.delete(query);
  }

  count(query: any, limit?: number): Promise<number> {
    return this.organizationRepository.count(query, limit);
  }

  aggregate(query: any[], options?: { readPreference?: 'secondaryPreferred' | 'primary' }): Promise<any> {
    return this.organizationRepository.aggregate(query, options);
  }

  findOne(query: any, select?: any, options?: any): Promise<OrganizationEntity | null> {
    return this.organizationRepository.findOne(query, select, options);
  }

  find(query: any, select?: any, options?: any): Promise<OrganizationEntity[]> {
    return this.organizationRepository.find(query, select, options);
  }

  // eslint-disable-next-line require-yield
  async *findBatch(
    query: any,
    select?: string | undefined,
    options?: any,
    batchSize?: number | undefined
  ): AsyncGenerator<any, any, unknown> {
    return this.organizationRepository.findBatch(query, select, options, batchSize);
  }

  insertMany(data: any, ordered: boolean): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: any }> {
    return this.organizationRepository.insertMany(data, ordered);
  }

  updateOne(query: any, body: any): Promise<{ matched: number; modified: number }> {
    return this.organizationRepository.updateOne(query, body);
  }

  upsertMany(data: any): Promise<any> {
    return this.organizationRepository.upsertMany(data);
  }

  upsert(query: any, data: any): Promise<any> {
    return this.organizationRepository.upsert(query, data);
  }

  bulkWrite(bulkOperations: any, ordered: boolean): Promise<any> {
    return this.organizationRepository.bulkWrite(bulkOperations, ordered);
  }

  estimatedDocumentCount(): Promise<number> {
    return this.organizationRepository.estimatedDocumentCount();
  }
}
