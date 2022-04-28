// eslint-ignore max-len

import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository, DalException } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';

import { GetNotificationTemplateCommand } from '../get-notification-template/get-notification-template.command';

@Injectable()
export class DeleteNotificationTemplate {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    try {
      await this.notificationTemplateRepository.delete({ _id: command.templateId });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw new ApiException('Could not find notification template with id ' + command.templateId);
    }

    return (await this.notificationTemplateRepository.findDeleted({ _id: command.templateId }))[0];
  }
}
