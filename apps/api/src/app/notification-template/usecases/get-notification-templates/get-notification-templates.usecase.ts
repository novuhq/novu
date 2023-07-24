import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { GetNotificationTemplatesCommand } from './get-notification-templates.command';
import { NotificationTemplatesResponseDto } from '../../dto/notification-templates.response.dto';
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
