import { Injectable } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { NotificationGroupEntity, NotificationGroupRepository } from '@novu/dal';

@Injectable()
export class PromoteNotificationGroupChange {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: PromoteTypeChangeCommand) {
    const item = await this.notificationGroupRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as NotificationGroupEntity;

    if (!item) {
      return this.notificationGroupRepository.create({
        name: newItem.name,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _parentId: newItem._id,
      });
    }

    return await this.notificationGroupRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        name: newItem.name,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      }
    );
  }
}
