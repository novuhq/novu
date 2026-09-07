import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { NotificationGroupDBModel, NotificationGroupEntity } from './notification-group.entity';
import { NotificationGroup } from './notification-group.schema';

export class NotificationGroupRepository extends BaseRepository<
  NotificationGroupDBModel,
  NotificationGroupEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(NotificationGroup, NotificationGroupEntity);
  }
}
