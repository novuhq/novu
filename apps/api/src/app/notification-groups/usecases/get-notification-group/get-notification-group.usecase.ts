import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@novu/dal';
import { GetNotificationGroupCommand } from './get-notification-group.command';

@Injectable()
export class GetNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: GetNotificationGroupCommand): Promise<NotificationGroupEntity> {
    const result = await this.notificationGroupRepository.findById(command.id);
    if (result === null) throw new NotFoundException();

    return result;
  }
}
