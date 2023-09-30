import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationGroupRepository, DalException } from '@novu/dal';
import { DeleteNotificationGroupCommand } from './delete-notification-group.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
@Injectable()
export class DeleteNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: DeleteNotificationGroupCommand) {
    const { environmentId, id } = command;
    try {
      const group = await this.notificationGroupRepository.findOne({
        _environmentId: environmentId,
        _id: id,
      });

      if (group === null) throw new NotFoundException();

      await this.notificationGroupRepository.delete({
        _environmentId: environmentId,
        _id: id,
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
