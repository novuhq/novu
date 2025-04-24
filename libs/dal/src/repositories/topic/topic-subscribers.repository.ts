import { ExternalSubscriberId } from '@novu/shared';

import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import {
  CreateTopicSubscribersEntity,
  TopicSubscribersDBModel,
  TopicSubscribersEntity,
} from './topic-subscribers.entity';
import { TopicSubscribers } from './topic-subscribers.schema';
import { EnvironmentId, OrganizationId, TopicId, TopicKey } from './types';

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
  ): Promise<{ _id: string; topic: Record<string, unknown> }[]> {
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

  async addSubscribers(subscribers: CreateTopicSubscribersEntity[]): Promise<any[]> {
    const results = await this.upsertMany(subscribers);

    return results;
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
    };
    batchSize?: number;
  }): AsyncGenerator<{ _id: string; topics: string[] }, void, unknown> {
    const { _organizationId, _environmentId, topicIds, excludeSubscribers } = query;
    const mappedTopicIds = topicIds.map((id) => this.convertStringToObjectId(id));

    const aggregatePipeline = [
      {
        $match: {
          _organizationId: this.convertStringToObjectId(_organizationId),
          _environmentId: this.convertStringToObjectId(_environmentId),
          _topicId: { $in: mappedTopicIds },
          externalSubscriberId: { $nin: excludeSubscribers },
        },
      },
      {
        $group: {
          _id: '$externalSubscriberId',
          topics: { $push: '$_topicId' },
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
}
