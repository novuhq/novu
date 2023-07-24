import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { GetNotificationTemplatesCommand } from './get-notification-templates.command';
import { WorkflowsResponseDto } from '../../dto/workflows.response.dto';
/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the GetWorkflows usecase instead.
 */
@Injectable()
export class GetNotificationTemplates {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetNotificationTemplatesCommand): Promise<WorkflowsResponseDto> {
    const { data: list, totalCount } = await this.notificationTemplateRepository.getList(
      command.organizationId,
      command.environmentId,
      command.page * command.limit,
      command.limit
    );

    return { page: command.page, data: list, totalCount, pageSize: command.limit };
  }
}
