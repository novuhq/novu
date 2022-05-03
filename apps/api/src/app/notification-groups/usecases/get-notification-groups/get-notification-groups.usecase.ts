import { Injectable } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@novu/dal';
import { GetNotificationGroupsCommand } from './get-notification-groups.command';

@Injectable()
export class GetNotificationGroups {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: GetNotificationGroupsCommand): Promise<NotificationGroupEntity[]> {
    return await this.notificationGroupRepository.find({
      _environmentId: command.environmentId,
    });
  }
}
