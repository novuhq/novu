import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@notifire/dal';
import { GetNotificationTemplateCommand } from './get-notification-template.command';

@Injectable()
export class GetNotificationTemplate {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    return template;
  }
}
