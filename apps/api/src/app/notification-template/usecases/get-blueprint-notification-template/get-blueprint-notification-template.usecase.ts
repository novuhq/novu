import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetBlueprintNotificationTemplateCommand } from './get-blueprint-notification-template.command';

@Injectable()
export class GetBlueprintNotificationTemplate {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetBlueprintNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findBlueprint(command.templateId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} not found`);
    }

    return template;
  }
}
