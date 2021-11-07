import { Injectable } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@notifire/dal';
import { CreateNotificationGroupCommand } from './create-notification-group.command';

@Injectable()
export class CreateNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: CreateNotificationGroupCommand): Promise<NotificationGroupEntity> {
    return await this.notificationGroupRepository.create({
      _applicationId: command.applicationId,
      _organizationId: command.organizationId,
      name: command.name,
    });
  }
}
