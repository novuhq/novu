import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetNotificationTemplatesCommand } from './get-notification-templates.command';
import { WorkflowsResponseDto } from '../../dto/workflows.response.dto';
import { GetActiveIntegrationsStatus } from '../get-active-integrations-status/get-active-integrations-status.usecase';
import { WorkflowResponse } from '../../dto/workflow-response.dto';
import { GetActiveIntegrationsStatusCommand } from '../get-active-integrations-status/get-active-integrations-status.command';
/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the GetWorkflows usecase instead.
 */
@Injectable()
export class GetNotificationTemplates {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getActiveIntegrationsStatusUsecase: GetActiveIntegrationsStatus
  ) {}

  async execute(command: GetNotificationTemplatesCommand): Promise<WorkflowsResponseDto> {
    const { data: list, totalCount } = await this.notificationTemplateRepository.getList(
      command.organizationId,
      command.environmentId,
      command.page * command.limit,
      command.limit,
      command.query
    );

    const workflows = await this.updateHasActiveIntegrationFlag(list, command);

    return { page: command.page, data: workflows, totalCount, pageSize: command.limit };
  }

  private async updateHasActiveIntegrationFlag(
    workflows: NotificationTemplateEntity[],
    command: GetNotificationTemplatesCommand
  ): Promise<WorkflowResponse[]> {
    return (await this.getActiveIntegrationsStatusUsecase.execute(
      GetActiveIntegrationsStatusCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        workflows,
      })
    )) as WorkflowResponse[];
  }
}
