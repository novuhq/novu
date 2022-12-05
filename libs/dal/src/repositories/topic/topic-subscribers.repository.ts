import { AuthProviderEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { TopicSubscribersEntity } from './topic-subscribers.entity';
import { TopicSubscribers } from './topic-subscribers.schema';
import { EnvironmentId, OrganizationId } from './types';

import { BaseRepository } from '../base-repository';

type IPartialTopicSubscribersEntity = Omit<TopicSubscribersEntity, '_environmentId' | '_organizationId'>;

type EnforceEnvironmentQuery = FilterQuery<IPartialTopicSubscribersEntity> &
  ({ _environmentId: EnvironmentId } | { _organizationId: OrganizationId });

export class TopicSubscribersRepository extends BaseRepository<EnforceEnvironmentQuery, TopicSubscribersEntity> {
  constructor() {
    super(TopicSubscribers, TopicSubscribersEntity);
  }
}
