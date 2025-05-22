import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { SortOrder } from '../../types/sort-order';
import { BaseRepository } from '../base-repository';
import { TopicDBModel, TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';
import { EnvironmentId, ExternalSubscriberId, OrganizationId, TopicId, TopicKey, TopicName } from './types';

const TOPIC_SUBSCRIBERS_COLLECTION = 'topicsubscribers';

const topicWithSubscribersProjection = {
  $project: {
    _id: 1,
    _environmentId: 1,
    _organizationId: 1,
    createdAt: 1,
    updatedAt: 1,
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

  estimatedDocumentCount() {
    return this.MongooseModel.estimatedDocumentCount();
  }

  async listTopics({
    organizationId,
    environmentId,
    limit = 10,
    after,
    before,
    key,
    name,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
  }: {
    organizationId: string;
    environmentId: string;
    limit?: number;
    after?: string;
    before?: string;
    key?: string;
    name?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
  }): Promise<{
    topics: TopicEntity[];
    next: string | null;
    previous: string | null;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    let topic: TopicEntity | null = null;
    const id = before || after;

    if (id) {
      topic = await this.findOne({
        _environmentId: environmentId,
        _organizationId: organizationId,
        _id: id,
      });

      if (!topic) {
        return {
          topics: [],
          next: null,
          previous: null,
        };
      }
    }

    const afterCursor = after && topic ? { sortBy: topic[sortBy], paginateField: topic._id } : undefined;
    const beforeCursor = before && topic ? { sortBy: topic[sortBy], paginateField: topic._id } : undefined;

    const query: FilterQuery<TopicDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    if (key) {
      query.key = { $regex: key, $options: 'i' };
    }

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    const pagination = await this.findWithCursorBasedPagination({
      after: afterCursor,
      before: beforeCursor,
      paginateField: '_id',
      limit,
      sortDirection: sortDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      sortBy,
      includeCursor,
      query,
    });

    return {
      topics: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
    };
  }
}
