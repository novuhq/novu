import { Injectable } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@novu/dal';
import { UpdateNotificationGroupCommand } from './update-notification-group.command';

@Injectable()
export class UpdateNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: UpdateNotificationGroupCommand): Promise<NotificationGroupEntity> {
    const group = await this.notificationGroupRepository.findOne({
      _organizationId: command.organizationId,
    });

    await this.notificationGroupRepository.update(
      {
        _id: command.id,
      },
      {
        $set: {
          name: command.name,
        },
      }
    );

    const item = this.notificationGroupRepository.findById(command.id);

    return item;
  }
}
