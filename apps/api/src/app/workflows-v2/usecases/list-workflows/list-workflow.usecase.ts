import { Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { ListWorkflowsCommand } from './list-workflows.command';
import { ListWorkflowResponse } from '../../dto/workflow-commons-fields';
import { toWorkflowsMinifiedDtos } from '../../mappers/notification-template-mapper';

@Injectable()
export class ListWorkflowsUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: ListWorkflowsCommand): Promise<ListWorkflowResponse> {
    const res = await this.notificationTemplateRepository.getList(
      command.user.organizationId,
      command.user.environmentId,
      command.offset,
      command.limit,
      command.searchQuery
    );
    if (res.data === null || res.data === undefined) {
      return { workflows: [], totalResults: 0 };
    }

    return {
      workflows: toWorkflowsMinifiedDtos(res.data),
      totalResults: res.totalCount,
    };
  }
}
