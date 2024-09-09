import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationGroupRepository, NotificationTemplateRepository } from '@novu/dal';
import { ListWorkflowsCommand } from './list-workflows.command';
import { ListWorkflowResponse } from '../../dto/workflow.dto';
import { WorkflowTemplateGetMapper } from '../../mappers/workflow-template-get-mapper';

@Injectable()
export class ListWorkflowsUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
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
    ); // todo: map to v2 workflow and return it

    if (res.data === null || res.data === undefined) {
      throw new BadRequestException(`Workflow not found with id`);
    }

    return {
      workflowSummaries: WorkflowTemplateGetMapper.toWorkflowsMinifiedDtos(res.data),
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
