import { DirectionEnum, ExternalSubscriberId } from '@novu/shared';

import { FilterQuery, mongo } from 'mongoose';
import { DalException, TopicEntity } from '../..';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import {
  CreateTopicSubscribersEntity,
  TopicSubscribersDBModel,
  TopicSubscribersEntity,
} from './topic-subscribers.entity';
import { TopicSubscribers } from './topic-subscribers.schema';
import { EnvironmentId, OrganizationId, TopicId, TopicKey } from './types';

export interface BulkAddTopicSubscribersResult {
  created: TopicSubscribersEntity[];
  updated: TopicSubscribersEntity[];
  failed: Array<{
    message: string;
    subscriberId: string;
    topicKey: string;
  }>;
}

export class TopicSubscribersRepository extends BaseRepository<
  TopicSubscribersDBModel,
  TopicSubscribersEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(TopicSubscribers, TopicSubscribersEntity);
  }

  async findTopicsByTopicKeys(
    environmentId: EnvironmentId,
    topicKeys: TopicKey[]
  ): Promise<{ _id: string; topic: TopicEntity }[]> {
    if (!topicKeys.length) {
      return [];
    }

    const aggregationPipeline = [
      {
        $match: {
          _environmentId: this.convertStringToObjectId(environmentId),
          topicKey: { $in: topicKeys },
        },
      },
      {
        $lookup: {
          from: 'topics',
          localField: '_topicId',
          foreignField: '_id',
          as: 'topic',
        },
      },
      { $unwind: '$topic' },
      {
        $group: {
          _id: '$topicKey',
          topic: { $first: '$topic' },
        },
      },
    ];

    return await this.aggregate(aggregationPipeline);
  }

  async createSubscriptions(subscriptions: CreateTopicSubscribersEntity[]): Promise<BulkAddTopicSubscribersResult> {
    const bulkUpsertWriteOps = subscriptions.map((subscription) => {
      const { _subscriberId, _topicId, _environmentId, identifier, contextKeys } = subscription;

      const filter: Partial<CreateTopicSubscribersEntity> = {
        _environmentId,
        _subscriberId,
        _topicId,
        identifier,
        ...(contextKeys && contextKeys.length > 0 ? { contextKeys } : {}),
      };

      return {
        updateOne: {
          filter,
          update: { $set: subscription },
          upsert: true,
        },
      };
    });

    let bulkResponse: mongo.BulkWriteResult;
    let writeErrors: Array<{ err: { index: number; errmsg: string } }> = [];
    try {
      bulkResponse = await this.bulkWrite(bulkUpsertWriteOps);
    } catch (e: unknown) {
      if (isErrorWithWriteErrors(e)) {
        if (!e.writeErrors) {
          throw new DalException(e.message || 'Unknown error');
        }
        bulkResponse = e.result as mongo.BulkWriteResult;
        writeErrors = e.writeErrors as Array<{ err: { index: number; errmsg: string } }>;
      } else {
        throw new DalException('An unknown error occurred while adding topic subscribers');
      }
    }

    const upsertedIds = bulkResponse.upsertedIds || {};

    const createdOrFailedIndexes: number[] = [];

    const createdSubscribers: TopicSubscribersEntity[] = [];
    for (const [index, _id] of Object.entries(upsertedIds)) {
      const numericIndex = parseInt(index, 10);
      createdOrFailedIndexes.push(numericIndex);
      const subscription = subscriptions[numericIndex];
      if (subscription) {
        createdSubscribers.push({
          _id: _id.toString(),
          ...subscription,
        } as TopicSubscribersEntity);
      }
    }

    let failed: Array<{ message: string; subscriberId: string; topicKey: string }> = [];
    if (writeErrors.length > 0) {
      failed = writeErrors.map((error) => {
        createdOrFailedIndexes.push(error.err.index);
        const subscriber = subscriptions[error.err.index];

        return {
          message: error.err.errmsg,
          subscriberId: subscriber?.externalSubscriberId ?? 'unknown',
          topicKey: subscriber?.topicKey ?? 'unknown',
        };
      });
    }

    const updatedSubscriptionsInput = subscriptions.filter((_, index) => !createdOrFailedIndexes.includes(index));

    const updatedSubscribers: TopicSubscribersEntity[] = [];
    if (updatedSubscriptionsInput.length > 0) {
      for (const subscription of updatedSubscriptionsInput) {
        const { _subscriberId, _topicId, _environmentId, _organizationId } = subscription;

        const filter: Partial<CreateTopicSubscribersEntity> = {
          _organizationId,
          _subscriberId,
          _topicId,
        };

        const found = await this.findOne({ ...filter, _environmentId });
        if (found) {
          updatedSubscribers.push(found);
        }
      }
    }

    return {
      created: createdSubscribers,
      updated: updatedSubscribers,
      failed,
    };
  }

  async *getTopicDistinctSubscribers({
    query,
    batchSize = 500,
  }: {
    query: {
      _environmentId: EnvironmentId;
      _organizationId: OrganizationId;
      topicIds: string[];
      excludeSubscribers: string[];
      contextKeys?: string[];
    };
    batchSize?: number;
  }): AsyncGenerator<{ _id: string; subscriberId: string; _topicId: string; identifier: string }, void, unknown> {
    const { _organizationId, _environmentId, topicIds, excludeSubscribers, contextKeys } = query;
    const mappedTopicIds = topicIds.map((id) => this.convertStringToObjectId(id));

    // Build context query: undefined = no filter (backward compatibility), otherwise use shared method
    const contextMatch = contextKeys !== undefined ? this.buildContextExactMatchQuery(contextKeys) : {};

    const aggregatePipeline = [
      {
        $match: {
          _organizationId: this.convertStringToObjectId(_organizationId),
          _environmentId: this.convertStringToObjectId(_environmentId),
          _topicId: { $in: mappedTopicIds },
          externalSubscriberId: { $nin: excludeSubscribers },
          ...contextMatch,
        },
      },
      {
        $project: {
          _id: '$_id',
          subscriberId: '$externalSubscriberId',
          _topicId: '$_topicId',
          identifier: '$identifier',
        },
      },
    ];

    for await (const doc of this._model.aggregate(aggregatePipeline, { batchSize }).cursor()) {
      yield doc;
    }
  }

  async findOneByTopicKeyAndExternalSubscriberId(
    _environmentId: EnvironmentId,
    _organizationId: OrganizationId,
    topicKey: TopicKey,
    externalSubscriberId: ExternalSubscriberId
  ): Promise<TopicSubscribersEntity | null> {
    return this.findOne({
      _environmentId,
      _organizationId,
      topicKey,
      externalSubscriberId,
    });
  }

  async findSubscribersByTopicId(
    _environmentId: EnvironmentId,
    _organizationId: OrganizationId,
    _topicId: TopicId
  ): Promise<TopicSubscribersEntity[]> {
    return this.find({
      _environmentId,
      _organizationId,
      _topicId,
    });
  }

  async removeSubscribers(
    _environmentId: EnvironmentId,
    _organizationId: OrganizationId,
    topicKey: TopicKey,
    externalSubscriberIds: ExternalSubscriberId[]
  ): Promise<void> {
    await this.delete({
      _environmentId,
      _organizationId,
      topicKey,
      externalSubscriberId: {
        $in: externalSubscriberIds,
      },
    });
  }

  async findTopicSubscriptionsWithPagination({
    environmentId,
    organizationId,
    topicKey,
    subscriberId,
    contextKeys,
    limit = 10,
    before,
    after,
    orderDirection = DirectionEnum.DESC,
    includeCursor,
  }): Promise<{
    data: TopicSubscribersEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    // Build query for topic subscriptions
    const query: FilterQuery<TopicSubscribersDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    if (topicKey) {
      query.topicKey = topicKey;
    }

    if (subscriberId) {
      query.externalSubscriberId = subscriberId;
    }

    if (contextKeys) {
      Object.assign(query, this.buildContextExactMatchQuery(contextKeys));
    }

    // Handle cursor-based pagination
    let subscription: TopicSubscribersEntity | null = null;
    const id = before || after;

    if (id) {
      subscription = await this.findOne({
        _environmentId: environmentId,
        _organizationId: organizationId,
        _id: id,
      });

      if (!subscription) {
        return {
          data: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor =
      after && subscription
        ? {
            sortBy: subscription._id,
            paginateField: subscription._id,
          }
        : undefined;
    const beforeCursor =
      before && subscription
        ? {
            sortBy: subscription._id,
            paginateField: subscription._id,
          }
        : undefined;

    // Use cursor-based pagination
    const subscriptionsPagination = await this.findWithCursorBasedPagination({
      query,
      paginateField: '_id',
      sortBy: '_id',
      sortDirection: orderDirection,
      limit,
      after: afterCursor,
      before: beforeCursor,
      includeCursor,
    });

    return subscriptionsPagination;
  }

  async countSubscriptionsPerSubscriber({
    environmentId,
    organizationId,
    topicId,
    subscriberIds,
  }: {
    environmentId: string;
    organizationId: string;
    topicId: string;
    subscriberIds: string[];
  }): Promise<Map<string, number>> {
    if (subscriberIds.length === 0) {
      return new Map();
    }

    const mappedSubscriberIds = subscriberIds.map((id) => this.convertStringToObjectId(id));
    const mappedTopicId = this.convertStringToObjectId(topicId);

    const aggregationPipeline = [
      {
        $match: {
          _environmentId: this.convertStringToObjectId(environmentId),
          _organizationId: this.convertStringToObjectId(organizationId),
          _topicId: mappedTopicId,
          _subscriberId: { $in: mappedSubscriberIds },
        },
      },
      {
        $group: {
          _id: '$_subscriberId',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await this.aggregate(aggregationPipeline);
    const countMap = new Map<string, number>();

    for (const result of results) {
      const subscriberId = result._id?.toString();
      if (subscriberId) {
        countMap.set(subscriberId, result.count || 0);
      }
    }

    return countMap;
  }
}

function isErrorWithWriteErrors(e: unknown): e is { writeErrors?: unknown; message?: string; result?: unknown } {
  return typeof e === 'object' && e !== null && 'writeErrors' in e;
}
