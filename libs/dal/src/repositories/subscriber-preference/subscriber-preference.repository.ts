import { BaseRepository, Omit } from '../base-repository';
import { SubscriberPreferenceEntity } from './subscriber-preference.entity';
import { SubscriberPreference } from './subscriber-preference.schema';
import { Document, FilterQuery, ProjectionType } from 'mongoose';
import { Cached, ICacheService, InvalidateCache } from '../../shared';
import { ICacheConfig } from '../../shared/interceptors/shared-cache';

class PartialIntegrationEntity extends Omit(SubscriberPreferenceEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

type EnforceIdentifierQuery = FilterQuery<PartialIntegrationEntity & Document> & {
  _environmentId: string;
} & {
  _subscriberId: string;
};

export class SubscriberPreferenceRepository extends BaseRepository<
  EnforceEnvironmentQuery,
  SubscriberPreferenceEntity
> {
  constructor(cacheService?: ICacheService) {
    super(SubscriberPreference, SubscriberPreferenceEntity, cacheService);
  }

  @InvalidateCache()
  async update(
    query: EnforceIdentifierQuery,
    updateBody: any
  ): Promise<{
    matched: number;
    modified: number;
  }> {
    return super.update(query, updateBody);
  }

  @InvalidateCache()
  async create(data: EnforceEnvironmentQuery) {
    return super.create(data);
  }

  @Cached()
  async findOne(query: EnforceIdentifierQuery, select?: ProjectionType<any>, cacheConfig?: ICacheConfig) {
    return super.findOne(query, select);
  }

  @InvalidateCache()
  async delete(query: EnforceIdentifierQuery) {
    return super.delete(query);
  }

  async findSubscriberPreferences(
    environmentId: string,
    subscriberId: string,
    templatesIds: string[]
  ): Promise<SubscriberPreferenceEntity[]> {
    return await this.find({
      _environmentId: environmentId,
      _subscriberId: subscriberId,
      _templateId: {
        $in: templatesIds,
      },
    });
  }
}
