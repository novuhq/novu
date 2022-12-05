import { Injectable } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@novu/dal';
import { UpdateNotificationGroupCommand } from './update-notification-group.command';

@Injectable()
export class UpdateNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: UpdateNotificationGroupCommand): Promise<NotificationGroupEntity> {
    await this.notificationGroupRepository.update(
      {
        _id: command.id,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          name: command.name,
        },
      }
    );

    return this.notificationGroupRepository.findById(command.id);
  }
}
