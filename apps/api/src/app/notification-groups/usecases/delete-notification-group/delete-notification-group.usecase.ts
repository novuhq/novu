import { Injectable } from '@nestjs/common';
import { NotificationGroupRepository, DalException } from '@novu/dal';
import { DeleteNotificationGroupCommand } from './delete-notification-group.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
@Injectable()
export class DeleteNotificationGroup {
  constructor(private notificationGroupRepository: NotificationGroupRepository) {}

  async execute(command: DeleteNotificationGroupCommand) {
    try {
      const group = await this.notificationGroupRepository.findOne({
        _organizationId: command.organizationId,
      });

      return (await this.notificationGroupRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.id,
        _parentId: group?._id,
      })) as { acknowledged: boolean; deletedCount: number };
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }
  }
}
