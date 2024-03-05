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
    const isInternalId = NotificationTemplateRepository.isInternalId(command.workflowIdOrIdentifier);

    let template: NotificationTemplateEntity | null;

    if (isInternalId) {
      template = await this.notificationTemplateRepository.findById(
        command.workflowIdOrIdentifier,
        command.environmentId
      );
    } else {
      template = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        command.workflowIdOrIdentifier
      );
    }

    if (!template) {
      throw new NotFoundException(`Template with id ${command.workflowIdOrIdentifier} not found`);
    }

    return template;
  }
}
