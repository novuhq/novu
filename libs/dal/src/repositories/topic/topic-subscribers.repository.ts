import { ExternalSubscriberId } from '@novu/shared';

import {
  CreateTopicSubscribersEntity,
  TopicSubscribersEntity,
  TopicSubscribersDBModel,
} from './topic-subscribers.entity';
import { TopicSubscribers } from './topic-subscribers.schema';
import { EnvironmentId, OrganizationId, TopicId, TopicKey } from './types';
import { BaseRepository } from '../base-repository';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { FilterQuery } from 'mongoose';

type TopicSubscribersQuery = FilterQuery<TopicSubscribersDBModel>;

export class TopicSubscribersRepository extends BaseRepository<
  TopicSubscribersDBModel,
  TopicSubscribersEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(TopicSubscribers, TopicSubscribersEntity);
  }

  async addSubscribers(subscribers: CreateTopicSubscribersEntity[]): Promise<void> {
    await this.upsertMany(subscribers);
  }

  async *getTopicDistinctSubscribers({
    _environmentId,
    _organizationId,
    topicIds,
    excludeSubscribers,
  }: {
    _environmentId: EnvironmentId;
    _organizationId: OrganizationId;
    topicIds: string[];
    excludeSubscribers: string[];
  }) {
    const mappedTopicIds = topicIds.map((id) => this.convertStringToObjectId(id));

    for await (const doc of this.aggregateBatch([
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
        },
      },
    ])) {
      yield doc;
    }
  }

  async getDistinctSubscribers(
    query: TopicSubscribersQuery & {
      _environmentId: string;
    },
    options?: {
      limit?: number;
      skip?: number;
    }
  ) {
    const data = await this.MongooseModel.distinct('externalSubscriberId', query)
      .limit(options?.limit || 10)
      .skip(options?.skip || 10);

    return this.mapEntities(data);
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
