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
