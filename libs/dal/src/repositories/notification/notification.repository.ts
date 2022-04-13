import { BaseRepository } from '../base-repository';
import { NotificationEntity } from './notification.entity';
import { Notification } from './notification.schema';

export class NotificationRepository extends BaseRepository<NotificationEntity> {
  constructor() {
    super(Notification, NotificationEntity);
  }

  async findBySubscriberId(environmentId: string, subscriberId: string) {
    return await this.find({
      _environmentId: environmentId,
      _subscriberId: subscriberId,
    });
  }
}
