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
    let res;
    
    if (command.tags && command.tags.length > 0) {
      const organizationId = command.user.organizationId;
      const environmentId = command.user.environmentId;
      const skip = command.offset;
      const limit = command.limit;
      const query = command.searchQuery;
      const excludeNewDashboardWorkflows = false;
      const orderBy = command.orderBy;
      const orderDirection = command.orderDirection;
      
      const repo = this.notificationTemplateRepository;
      
      const searchQuery: any = {};
      
      if (query) {
        searchQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { 'triggers.identifier': { $regex: query, $options: 'i' } },
        ];
      }
      
      if (excludeNewDashboardWorkflows) {
        searchQuery.$nor = [{ origin: 'novu-cloud', type: 'BRIDGE' }];
      }
      
      if (command.tags && command.tags.length > 0) {
        searchQuery.tags = { $in: command.tags };
      }
      
      const totalItemsCount = await repo.count({
        _environmentId: environmentId,
        ...searchQuery,
      });
      
      const items = await repo.find({
        _environmentId: environmentId,
        _organizationId: organizationId,
        ...searchQuery,
      }, {
        sort: { [orderBy]: orderDirection === 'ASC' ? 1 : -1 },
        skip,
        limit,
      });
      
      res = { totalCount: totalItemsCount, data: items };
    } else {
      res = await this.notificationTemplateRepository.getList(
        command.user.organizationId,
        command.user.environmentId,
        command.offset,
        command.limit,
        command.searchQuery,
        false,
        command.orderBy,
        command.orderDirection
      );
    }
    if (res.data === null || res.data === undefined) {
      return { workflows: [], totalCount: 0 };
    }

    return {
      workflows: toWorkflowsMinifiedDtos(res.data),
      totalCount: res.totalCount,
    };
  }
}
