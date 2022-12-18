import { AuthProviderEnum, ExternalSubscriberId } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { TopicSubscribersEntity } from './topic-subscribers.entity';
import { TopicSubscribers } from './topic-subscribers.schema';
import { EnvironmentId, OrganizationId, TopicId, TopicKey } from './types';

import { BaseRepository } from '../base-repository';

type IPartialTopicSubscribersEntity = Omit<TopicSubscribersEntity, '_environmentId' | '_organizationId'>;

type EnforceEnvironmentQuery = FilterQuery<IPartialTopicSubscribersEntity> &
  ({ _environmentId: EnvironmentId } | { _organizationId: OrganizationId });

export class TopicSubscribersRepository extends BaseRepository<EnforceEnvironmentQuery, TopicSubscribersEntity> {
  constructor() {
    super(TopicSubscribers, TopicSubscribersEntity);
  }

  async addSubscribers(subscribers: TopicSubscribersEntity[]): Promise<void> {
    await this.upsertMany(subscribers);
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
      key: topicKey,
      externalSubscriberId: {
        $in: externalSubscriberIds,
      },
    });
  }
}
