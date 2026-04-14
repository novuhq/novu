import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { AgentDBModel, AgentEntity } from './agent.entity';
import { Agent } from './agent.schema';

export class AgentRepository extends BaseRepositoryV2<AgentDBModel, AgentEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Agent, AgentEntity);
  }

  async listAgents({
    organizationId,
    environmentId,
    limit = 10,
    after,
    before,
    sortBy = '_id',
    sortDirection = 1,
    includeCursor = false,
    identifier,
  }: {
    organizationId: string;
    environmentId: string;
    limit?: number;
    after?: string;
    before?: string;
    sortBy?: string;
    sortDirection?: SortOrder;
    includeCursor?: boolean;
    identifier?: string;
  }): Promise<{
    agents: AgentEntity[];
    next: string | null;
    previous: string | null;
    totalCount: number;
    totalCountCapped: boolean;
  }> {
    if (before && after) {
      throw new Error('Cannot specify both "before" and "after" cursors at the same time.');
    }

    let agent: AgentEntity | null = null;
    const id = before || after;

    if (id) {
      agent = await this.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _id: id,
        },
        '*'
      );

      if (!agent) {
        return {
          agents: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor = after && agent ? { sortBy: agent[sortBy], paginateField: agent._id } : undefined;
    const beforeCursor = before && agent ? { sortBy: agent[sortBy], paginateField: agent._id } : undefined;

    const query: FilterQuery<AgentDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    if (identifier) {
      query.identifier = { $regex: this.regExpEscape(identifier), $options: 'i' };
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
      agents: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
