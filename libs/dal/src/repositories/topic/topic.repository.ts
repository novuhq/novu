import { AuthProviderEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { EnvironmentId, OrganizationId, TopicKey, TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';

import { BaseRepository } from '../base-repository';

type IPartialTopicEntity = Omit<TopicEntity, '_environmentId' | '_organizationId'>;

type EnforceEnvironmentQuery = FilterQuery<IPartialTopicEntity> &
  ({ _environmentId: EnvironmentId } | { _organizationId: OrganizationId });

export class TopicRepository extends BaseRepository<EnforceEnvironmentQuery, TopicEntity> {
  constructor() {
    super(Topic, TopicEntity);
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
}
