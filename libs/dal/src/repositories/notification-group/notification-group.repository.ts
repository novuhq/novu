import { BaseRepository } from '../base-repository';
import { NotificationGroupEntity, NotificationGroupDBModel } from './notification-group.entity';
import { NotificationGroup } from './notification-group.schema';
export class NotificationGroupRepository extends BaseRepository<NotificationGroupDBModel, NotificationGroupEntity> {
  constructor() {
    super(NotificationGroup, NotificationGroupEntity);
  }
}
