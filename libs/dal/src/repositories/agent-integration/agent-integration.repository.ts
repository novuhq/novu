import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { AgentIntegrationDBModel, AgentIntegrationEntity } from './agent-integration.entity';
import { AgentIntegration } from './agent-integration.schema';

export class AgentIntegrationRepository extends BaseRepositoryV2<
  AgentIntegrationDBModel,
  AgentIntegrationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(AgentIntegration, AgentIntegrationEntity);
  }

  async listAgentIntegrationsForAgent({
    organizationId,
    environmentId,
    agentId,
    limit = 10,
    after,
    before,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
    integrationId,
  }: {
    organizationId: string;
    environmentId: string;
    agentId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
    integrationId?: string;
  }): Promise<{
    links: AgentIntegrationEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    let link: AgentIntegrationEntity | null = null;
    const id = before || after;

    if (id) {
      link = await this.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _agentId: agentId,
          _id: id,
        },
        '*'
      );

      if (!link) {
        return {
          links: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor = after && link ? { sortBy: link[sortBy], paginateField: link._id } : undefined;
    const beforeCursor = before && link ? { sortBy: link[sortBy], paginateField: link._id } : undefined;

    const query: FilterQuery<AgentIntegrationDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _agentId: agentId,
    };

    if (integrationId) {
      query._integrationId = integrationId;
    }

    const pagination = await this.findWithCursorBasedPagination({
      after: afterCursor,
      before: beforeCursor,
      paginateField: '_id',
      limit,
      sortDirection: sortDirection === 1 ? DirectionEnum.ASC : DirectionEnum.DESC,
      sortBy,
      includeCursor,
      query,
      select: '*',
    });

    return {
      links: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
