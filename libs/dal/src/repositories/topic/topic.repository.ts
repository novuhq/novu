import { AuthProviderEnum, ExternalSubscriberId } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';
import { TopicSubscribers } from './topic-subscribers.schema';
import { EnvironmentId, OrganizationId, TopicKey } from './types';

import { BaseRepository, Omit } from '../base-repository';

const TOPIC_SUBSCRIBERS_COLLECTION = 'topicsubscribers';

class PartialIntegrationEntity extends Omit(TopicEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity> &
  ({ _environmentId: EnvironmentId } | { _organizationId: OrganizationId });

const topicWithSubscribersProjection = {
  $project: {
    _id: 1,
    _environmentId: 1,
    _organizationId: 1,
    key: 1,
    name: 1,
    subscribers: '$topicSubscribers.externalSubscriberId',
  },
};

const lookup = {
  $lookup: {
    from: TOPIC_SUBSCRIBERS_COLLECTION,
    localField: '_id',
    foreignField: '_topicId',
    as: 'topicSubscribers',
  },
};

export class TopicRepository extends BaseRepository<EnforceEnvironmentQuery, TopicEntity> {
  constructor() {
    super(Topic, TopicEntity);
  }

  async createTopic(entity: Omit<TopicEntity, '_id'>): Promise<TopicEntity> {
    const { key, name, _environmentId, _organizationId } = entity;

    return await this.create({
      _environmentId,
      key,
      name,
      _organizationId,
    });
  }

  async filterTopics(
    query: EnforceEnvironmentQuery,
    pagination: { limit: number; skip: number }
  ): Promise<TopicEntity & { subscribers: ExternalSubscriberId[] }[]> {
    const data = await this.aggregate([
      {
        $match: {
          ...query,
        },
      },
      lookup,
      topicWithSubscribersProjection,
      {
        $limit: pagination.limit,
      },
      {
        $skip: pagination.skip,
      },
    ]);

    return data;
  }

  async findTopic(
    entity: Omit<TopicEntity, 'key' | 'name' | 'subscribers'>
  ): Promise<TopicEntity & { subscribers: ExternalSubscriberId[] }> {
    const { _environmentId, _id, _organizationId } = entity;

    const [result] = await this.aggregate([
      {
        $match: { _organizationId, _environmentId, _id },
      },
      lookup,
      topicWithSubscribersProjection,
      { $limit: 1 },
    ]);

    if (!result) {
      return undefined;
    }

    return result;
  }

  async findTopicByKey(
    key: TopicKey,
    organizationId: OrganizationId,
    environmentId: EnvironmentId
  ): Promise<TopicEntity> {
    return await this.findOne({
      key,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });
  }

  async renameTopic(entity: Omit<TopicEntity, 'key'>): Promise<TopicEntity> {
    const { _environmentId, _id, _organizationId, _userId, name } = entity;

    await this.update(
      {
        _id,
        _environmentId,
        _organizationId,
        _userId,
      },
      {
        name,
      }
    );

    const updatedTopic = await this.findOne(entity);

    return this.mapEntity(updatedTopic);
  }
}
