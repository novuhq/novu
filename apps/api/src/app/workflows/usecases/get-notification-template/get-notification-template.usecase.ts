import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetNotificationTemplateCommand } from './get-notification-template.command';

@Injectable()
export class GetNotificationTemplate {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const workflow = await this.notificationTemplateRepository.findById(command.workflowId, command.environmentId);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${command.workflowId} not found`);
    }

    return workflow;
  }
}
