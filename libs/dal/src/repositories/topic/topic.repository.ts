import { AuthProviderEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';
import { EnvironmentId, OrganizationId, TopicKey, UserId } from './types';

import { BaseRepository, Omit } from '../base-repository';

class PartialIntegrationEntity extends Omit(TopicEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity> &
  ({ _environmentId: EnvironmentId } | { _organizationId: OrganizationId });

export class TopicRepository extends BaseRepository<EnforceEnvironmentQuery, TopicEntity> {
  constructor() {
    super(Topic, TopicEntity);
  }

  async createTopic(entity: Omit<TopicEntity, '_id'>): Promise<TopicEntity> {
    const { key, name, _environmentId, _organizationId, _userId } = entity;

    return await this.create({
      _environmentId,
      key,
      name,
      _organizationId,
      _userId,
    });
  }

  async findTopic(entity: Omit<TopicEntity, 'key' | 'name'>): Promise<TopicEntity> {
    const { _environmentId, _id, _organizationId, _userId } = entity;

    return await this.findOne({
      _environmentId,
      _id,
      _organizationId,
      _userId,
    });
  }

  async findTopicByKey(
    key: TopicKey,
    userId: UserId,
    organizationId: OrganizationId,
    environmentId: EnvironmentId
  ): Promise<TopicEntity> {
    return await this.findOne({
      key,
      _organizationId: organizationId,
      _environmentId: environmentId,
      _userId: userId,
    });
  }
}
