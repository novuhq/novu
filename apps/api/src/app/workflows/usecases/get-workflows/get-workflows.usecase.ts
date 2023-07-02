import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { GetWorkflowsCommand } from './get-workflows.command';
import { WorkflowsResponseDto } from '../../dto/notification-templates.response.dto';
@Injectable()
export class GetWorkflows {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetWorkflowsCommand): Promise<WorkflowsResponseDto> {
    const { data: list, totalCount } = await this.notificationTemplateRepository.getList(
      command.organizationId,
      command.environmentId,
      command.page * command.limit,
      command.limit
    );

    return { page: command.page, data: list, totalCount, pageSize: command.limit };
  }
}
