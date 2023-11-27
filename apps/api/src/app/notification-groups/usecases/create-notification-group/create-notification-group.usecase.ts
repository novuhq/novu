import { Injectable } from '@nestjs/common';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';
import { NotificationGroupRepository, NotificationGroupEntity } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';

import { CreateNotificationGroupCommand } from './create-notification-group.command';

@Injectable()
export class CreateNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository, private createChange: CreateChange) {}

  async execute(command: CreateNotificationGroupCommand): Promise<NotificationGroupEntity> {
    const group = await this.notificationGroupRepository.findOne({
      _organizationId: command.organizationId,
    });

    const item = await this.notificationGroupRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      name: command.name,
      _parentId: group?._id,
    });

    await this.createChange.execute(
      CreateChangeCommand.create({
        item,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_GROUP,
        changeId: NotificationGroupRepository.createObjectId(),
      })
    );

    return item;
  }
}
