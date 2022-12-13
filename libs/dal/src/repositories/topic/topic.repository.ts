import { AuthProviderEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';
import { TopicSubscribers } from './topic-subscribers.schema';
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
    const TOPIC_SUBSCRIBERS_COLLECTION = 'topicsubscribers';

    const { _environmentId, _id, _organizationId, _userId } = entity;

    const [result] = await this.aggregate([
      {
        $match: { _organizationId, _environmentId, _id, _userId },
      },
      {
        $lookup: {
          from: TOPIC_SUBSCRIBERS_COLLECTION,
          localField: '_id',
          foreignField: '_topicId',
          as: 'topicSubscribers',
        },
      },
      {
        $project: {
          _environmentId: 1,
          _organizationId: 1,
          _userId: 1,
          key: 1,
          name: 1,
          // The lookup returns a matrix so we return the first array element in the projection
          subscribers: { $arrayElemAt: ['$topicSubscribers.subscribers', 0] },
        },
      },
      { $limit: 1 },
    ]);

    if (!result) {
      return undefined;
    }

    return this.mapEntity(result);
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
