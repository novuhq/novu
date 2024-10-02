import { Injectable } from '@nestjs/common';

import { NotificationTemplateRepository } from '@novu/dal';
import { ListWorkflowResponse } from '@novu/shared';
import { ListWorkflowsCommand } from './list-workflows.command';
import { toWorkflowsMinifiedDtos } from '../../mappers/notification-template-mapper';

@Injectable()
export class ListWorkflowsUseCase {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}
  async execute(command: ListWorkflowsCommand): Promise<ListWorkflowResponse> {
    const res = await this.notificationTemplateRepository.getList(
      command.user.organizationId,
      command.user.environmentId,
      command.offset,
      command.limit,
      command.searchQuery
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
