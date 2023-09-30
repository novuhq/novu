import { FilterQuery } from 'mongoose';

import { TopicEntity, TopicDBModel } from './topic.entity';
import { Topic } from './topic.schema';
import { EnvironmentId, ExternalSubscriberId, OrganizationId, TopicId, TopicKey, TopicName } from './types';
import { BaseRepository } from '../base-repository';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

const TOPIC_SUBSCRIBERS_COLLECTION = 'topicsubscribers';

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

export class TopicRepository extends BaseRepository<TopicDBModel, TopicEntity, EnforceEnvOrOrgIds> {
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

  async deleteTopic(key: TopicKey, environmentId: EnvironmentId, organizationId: OrganizationId): Promise<void> {
    await this.delete({
      key,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });
  }

  async filterTopics(
    query: FilterQuery<TopicDBModel>,
    pagination: { limit: number; skip: number }
  ): Promise<TopicEntity & { subscribers: ExternalSubscriberId[] }[]> {
    const parsedQuery = { ...query };
    if (query._id) {
      parsedQuery._id = this.convertStringToObjectId(query._id);
    }

    parsedQuery._environmentId = this.convertStringToObjectId(query._environmentId);
    parsedQuery._organizationId = this.convertStringToObjectId(query._organizationId);

    const data = await this.aggregate([
      {
        $match: parsedQuery,
      },
      lookup,
      topicWithSubscribersProjection,
      {
        $skip: pagination.skip,
      },
      {
        $limit: pagination.limit,
      },
    ]);

    return data;
  }

  async findTopic(
    topicKey: TopicKey,
    environmentId: EnvironmentId
  ): Promise<(TopicEntity & { subscribers: ExternalSubscriberId[] }) | null> {
    const [result] = await this.aggregate([
      {
        $match: { _environmentId: this.convertStringToObjectId(environmentId), key: topicKey },
      },
      lookup,
      topicWithSubscribersProjection,
      { $limit: 1 },
    ]);

    if (!result) {
      return null;
    }

    return result;
  }

  async findTopicByKey(
    key: TopicKey,
    organizationId: OrganizationId,
    environmentId: EnvironmentId
  ): Promise<TopicEntity | null> {
    return await this.findOne({
      key,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });
  }

  async renameTopic(
    _id: TopicId,
    _environmentId: EnvironmentId,
    name: TopicName
  ): Promise<TopicEntity & { subscribers: ExternalSubscriberId[] }> {
    await this.update(
      {
        _id,
        _environmentId,
      },
      {
        name,
      }
    );

    const [updatedTopic] = await this.aggregate([
      {
        $match: {
          _id: this.convertStringToObjectId(_id),
          _environmentId: this.convertStringToObjectId(_environmentId),
        },
      },
      lookup,
      topicWithSubscribersProjection,
      {
        $limit: 1,
      },
    ]);

    return updatedTopic;
  }
}
