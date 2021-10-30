import { Injectable } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@notifire/dal';
import { GetNotificationGroupsCommand } from './get-notification-groups.command';
import { CreateNotificationGroup } from '../create-notification-group/create-notification-group.usecase';
import { CreateNotificationGroupCommand } from '../create-notification-group/create-notification-group.command';

@Injectable()
export class GetNotificationGroups {
  constructor(
    private notificationGroupRepository: NotificationGroupRepository,
    private createNotificationGroup: CreateNotificationGroup
  ) {}

  async execute(command: GetNotificationGroupsCommand): Promise<NotificationGroupEntity[]> {
    const groups = await this.notificationGroupRepository.find({
      _applicationId: command.applicationId,
    });

    if (!groups.length) {
      await this.createNotificationGroup.execute(
        CreateNotificationGroupCommand.create({
          organizationId: command.organizationId,
          applicationId: command.applicationId,
          userId: command.userId,
          name: 'General',
        })
      );
    }

    return await this.notificationGroupRepository.find({
      _applicationId: command.applicationId,
    });
  }
}
