import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationGroupRepository, NotificationGroupEntity } from '@novu/dal';
import { UpdateNotificationGroupCommand } from './update-notification-group.command';
import { NotificationGroupResponseDto } from '../../dtos/notification-group-response.dto';

@Injectable()
export class UpdateNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: UpdateNotificationGroupCommand) {
    const { id, environmentId, name } = command;

    const item = await this.notificationGroupRepository.findOne({
      _environmentId: environmentId,
      _id: id,
    });

    if (!item) {
      throw new NotFoundException();
    }

    await await this.notificationGroupRepository.update(
      {
        _id: id,
        _environmentId: environmentId,
      },
      {
        $set: {
          name,
        },
      }
    );

    const result = await this.notificationGroupRepository.findOne({
      _environmentId: environmentId,
      _id: id,
    });

    if (!result) {
      throw new NotFoundException(`Notification group with id ${id} not found`);
    }

    return result;
  }
}
