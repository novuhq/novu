import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository, OrganizationEntity } from '@notifire/dal';
import { GetNotificationTemplatesCommand } from './get-notification-templates.command';

@Injectable()
export class GetNotificationTemplates {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplatesCommand): Promise<NotificationTemplateEntity[]> {
    const list = await this.notificationTemplateRepository.getList(command.organizationId, command.applicationId);
    return list;
  }
}
