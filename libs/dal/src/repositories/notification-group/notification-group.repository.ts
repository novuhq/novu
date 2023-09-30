import { BaseRepository } from '../base-repository';
import { NotificationGroupEntity, NotificationGroupDBModel } from './notification-group.entity';
import { NotificationGroup } from './notification-group.schema';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

export class NotificationGroupRepository extends BaseRepository<
  NotificationGroupDBModel,
  NotificationGroupEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(NotificationGroup, NotificationGroupEntity);
  }
}
