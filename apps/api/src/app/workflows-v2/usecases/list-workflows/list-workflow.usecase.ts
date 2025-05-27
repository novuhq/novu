import { Injectable } from '@nestjs/common';

import { InstrumentUsecase } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { toWorkflowsMinifiedDtos } from '../../mappers/notification-template-mapper';
import { ListWorkflowsCommand } from './list-workflows.command';
import { ListWorkflowResponse } from '../../dtos';

@Injectable()
export class ListWorkflowsUseCase {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  @InstrumentUsecase()
  async execute(command: ListWorkflowsCommand): Promise<ListWorkflowResponse> {
    const res = command.tags && command.tags.length > 0
      ? await this.notificationTemplateRepository.getListWithTags({
          organizationId: command.user.organizationId,
          environmentId: command.user.environmentId,
          skip: command.offset,
          limit: command.limit,
          query: command.searchQuery,
          excludeNewDashboardWorkflows: false,
          orderBy: command.orderBy,
          orderDirection: command.orderDirection,
          tags: command.tags
        })
      : await this.notificationTemplateRepository.getList(
          command.user.organizationId,
          command.user.environmentId,
          command.offset,
          command.limit,
          command.searchQuery,
          false,
          command.orderBy,
          command.orderDirection
        );
    if (res.data === null || res.data === undefined) {
      return { workflows: [], totalCount: 0 };
    }

    return {
      workflows: toWorkflowsMinifiedDtos(res.data),
      totalCount: res.totalCount,
    };
  }
}
