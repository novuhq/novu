import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { ListWorkflowsCommand } from './list-workflows.command';
import { ListWorkflowResponse } from '../../dto/workflow-commons-fields';
import { NotificationTemplateMapper } from '../../mappers/notification-template-mapper';

@Injectable()
export class ListWorkflowsUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: ListWorkflowsCommand): Promise<ListWorkflowResponse> {
    await this.validateEnvironment(command);
    const res = await this.notificationTemplateRepository.getList(
      command.user.organizationId,
      command.user.environmentId,
      command.offset,
      command.limit,
      command.searchQuery
    );
    if (res.data === null || res.data === undefined) {
      return { workflowSummaries: [], totalResults: 0 };
    }

    return {
      workflowSummaries: NotificationTemplateMapper.toWorkflowsMinifiedDtos(res.data),
      totalResults: res.totalCount,
    };
  }

  private async validateEnvironment(command: ListWorkflowsCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }
}
