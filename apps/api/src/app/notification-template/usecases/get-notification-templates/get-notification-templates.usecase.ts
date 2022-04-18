import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository, OrganizationEntity } from '@novu/dal';
import { GetNotificationTemplatesCommand } from './get-notification-templates.command';

@Injectable()
export class GetNotificationTemplates {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplatesCommand): Promise<NotificationTemplateEntity[]> {
    const list = await this.notificationTemplateRepository.getList(command.organizationId, command.environmentId);

    return list;
  }
}
