import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetNotificationTemplateCommand } from './get-notification-template.command';

/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the GetWorkflow usecase instead.
 */
@Injectable()
export class GetNotificationTemplate {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const template = await this.notificationTemplateRepository.findByIdOrIdentifier({
      idOrIdentifier: command.workflowIdOrIdentifier,
      environmentId: command.environmentId,
    });

    if (!template) {
      throw new NotFoundException(`Template with id ${command.workflowIdOrIdentifier} not found`);
    }

    return template;
  }
}
