// eslint-ignore max-len

import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';

import { GetNotificationTemplateCommand } from '../get-notification-template/get-notification-template.command';

@Injectable()
export class DeleteNotificationTemplate {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const existingTemplate = await this.notificationTemplateRepository.findById(
      command.templateId,
      command.organizationId
    );
    if (!existingTemplate) throw new NotFoundException(`Entity with id ${command.templateId} not found`);

    await this.notificationTemplateRepository.update(
      {
        _id: command.templateId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          isDeleted: true,
        },
      }
    );

    return await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);
  }
}
