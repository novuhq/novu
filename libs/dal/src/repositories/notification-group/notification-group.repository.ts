import { BaseRepository, Omit } from '../base-repository';
import { NotificationGroupEntity } from './notification-group.entity';
import { NotificationGroup } from './notification-group.schema';
import { Document, FilterQuery } from 'mongoose';

class PartialIntegrationEntity extends Omit(NotificationGroupEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class NotificationGroupRepository extends BaseRepository<EnforceEnvironmentQuery, NotificationGroupEntity> {
  constructor() {
    super(NotificationGroup, NotificationGroupEntity);
  }
}
