import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository, OrganizationEntity } from '@novu/dal';
import { NotificationTemplatesResponseDto } from '../../dto/notification-templates.response.dto';
import { GetNotificationTemplatesCommand } from './get-notification-templates.command';
@Injectable()
export class GetNotificationTemplates {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplatesCommand): Promise<NotificationTemplatesResponseDto> {
    const { data: list, totalCount } = await this.notificationTemplateRepository.getList(
      command.organizationId,
      command.environmentId,
      command.page * command.limit,
      command.limit
    );

    return { page: command.page, data: list, totalCount, pageSize: command.limit };
  }
}
