import { BaseRepository } from '../base-repository';
import { NotificationEntity } from './notification.entity';
import { Notification } from './notification.schema';

export class NotificationRepository extends BaseRepository<NotificationEntity> {
  constructor() {
    super(Notification, NotificationEntity);
  }

  async findBySubscriberId(applicationId: string, subscriberId: string) {
    return await this.find({
      _applicationId: applicationId,
      _subscriberId: subscriberId,
    });
  }
}
