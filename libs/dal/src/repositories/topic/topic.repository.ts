import { AuthProviderEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import { TopicEntity } from './topic.entity';
import { Topic } from './topic.schema';
import { EnvironmentId, OrganizationId, TopicKey } from './types';

import { BaseRepository, Omit } from '../base-repository';

class PartialIntegrationEntity extends Omit(TopicEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity> &
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
