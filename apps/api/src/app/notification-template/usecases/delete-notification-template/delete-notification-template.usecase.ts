// eslint-ignore max-len

import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository, DalException } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { ApiException } from '../../../shared/exceptions/api.exception';

import { GetNotificationTemplateCommand } from '../get-notification-template/get-notification-template.command';

@Injectable()
export class DeleteNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createChange: CreateChange
  ) {}

  async execute(command: GetNotificationTemplateCommand) {
    try {
      await this.notificationTemplateRepository.delete({
        _environmentId: command.environmentId,
        _id: command.templateId,
      });
      const items = await this.notificationTemplateRepository.findDeleted({
        _environmentId: command.environmentId,
        _id: command.templateId,
      });
      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          item: items[0],
          type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
          changeId: NotificationTemplateRepository.createObjectId(),
        })
      );
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return true;
  }
}
