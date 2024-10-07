import { Types } from 'mongoose';
import { IPartnerConfiguration, OrganizationEntity } from './organization.entity';

export interface IOrganizationRepository extends IOrganizationRepositoryMongo {
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
  updateDefaultLocale(
    organizationId: string,
    defaultLocale: string
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

/**
 * MongoDB specific methods from base-repository.ts to achieve
 * common interface for EE and Community repositories
 */
export interface IOrganizationRepositoryMongo {
  create(data: any, options?: any): Promise<OrganizationEntity>;
  update(query: any, body: any): Promise<{ matched: number; modified: number }>;
  delete(query: any): Promise<{ acknowledged: boolean; deletedCount: number }>;
  count(query: any, limit?: number): Promise<number>;
  aggregate(query: any[], options?: { readPreference?: 'secondaryPreferred' | 'primary' }): Promise<any>;
  findOne(query: any, select?: any, options?: any): Promise<OrganizationEntity | null>;
  find(query: any, select?: any, options?: any): Promise<OrganizationEntity[]>;
  findBatch(query: any, select?: string, options?: any, batchSize?: number): AsyncGenerator<any>;
  insertMany(
    data: any,
    ordered: boolean
  ): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Types.ObjectId[] }>;
  updateOne(query: any, body: any): Promise<{ matched: number; modified: number }>;
  upsertMany(data: any): Promise<any>;
  upsert(query: any, data: any): Promise<any>;
  bulkWrite(bulkOperations: any, ordered: boolean): Promise<any>;
  estimatedDocumentCount(): Promise<number>;
}
