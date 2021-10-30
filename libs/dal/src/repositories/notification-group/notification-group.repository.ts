import { BaseRepository } from '../base-repository';
import { NotificationGroupEntity } from './notification-group.entity';
import { NotificationGroup } from './notification-group.schema';

export class NotificationGroupRepository extends BaseRepository<NotificationGroupEntity> {
  constructor() {
    super(NotificationGroup, NotificationGroupEntity);
  }
}
