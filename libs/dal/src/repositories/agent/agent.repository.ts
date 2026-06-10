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

  /**
   * Total number of active agents an organization has across all of its
   * environments. Inactive agents do not consume plan-limit slots.
   */
  async countByOrganization(organizationId: string): Promise<number> {
    return this.count({ _organizationId: organizationId, active: true });
  }

  /**
   * Total number of agents an organization has across all of its environments,
   * including inactive ones. Used for the hard creation cap — counting inactive
   * agents too prevents bypassing the cap via create/deactivate loops.
   */
  async countTotalByOrganization(organizationId: string): Promise<number> {
    return this.count({ _organizationId: organizationId });
  }

  /**
   * Number of active agents in the organization created before the given agent,
   * using `_id` (monotonic with creation time) as the ordering key. This is the
   * agent's zero-based rank among active agents and is used for plan-limit
   * enforcement; inactive agents do not consume slots.
   */
  async countOlderAgentsInOrganization(organizationId: string, agentId: string): Promise<number> {
    return this.count({
      _organizationId: organizationId,
      active: true,
      _id: { $lt: this.convertStringToObjectId(agentId) },
    });
  }

  /**
   * Ids of the oldest `limit` active agents in the organization, using `_id`
   * (monotonic with creation time) as the ordering key. These are the agents
   * that fall within the plan limit; any other active agent in the org is
   * over-limit. Inactive agents do not consume slots.
   */
  async findOldestAgentIds(organizationId: string, limit: number): Promise<string[]> {
    if (limit <= 0) {
      return [];
    }

    const agents = await this.find({ _organizationId: organizationId, active: true }, ['_id'], {
      sort: { _id: 1 },
      limit,
    });

    return agents.map((agent) => agent._id);
  }

  /**
   * Unscoped lookup by _id — used exclusively for inbound webhook bootstrap
   * where _environmentId / _organizationId are not yet known.
   */
  async findByIdForWebhook(agentId: string): Promise<AgentEntity | null> {
    const doc = await this.MongooseModel.findById(agentId).lean();
    if (!doc) return null;

    return this.mapProjectedEntity(doc) as AgentEntity;
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
