import { DirectionEnum } from '@novu/shared';
import { ClientSession, FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { isDuplicateKeyError } from '../../types/error.enum';
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

  /**
   * Distinct connected channel types (provider ids) in the environment, ordered
   * by the earliest time each channel type became connected (stable, ascending).
   *
   * A "channel" is a distinct provider (e.g. Slack, Microsoft Teams) — NOT a
   * distinct integration. An organization may connect several Slack workspaces
   * (multiple Slack integrations); they all share the same provider and count
   * as a single active channel. Used for active-channel plan-limit enforcement,
   * where the first N channel types (by connection order) are within the plan
   * limit. Counting is per environment so a channel promoted (synced) to
   * production does not consume a second plan slot for the same logical channel.
   *
   * Links whose integration was (soft-)deleted from the integration store are
   * excluded — a removed channel must not consume a plan slot, and stale links
   * may exist for integrations deleted before link cleanup was introduced.
   * Tombstoned (disconnected) links are excluded explicitly: the schema-level
   * exclusion hook does not apply to aggregation pipelines.
   */
  async listConnectedChannelTypesForEnvironment(organizationId: string, environmentId: string): Promise<string[]> {
    const result = await this.aggregate([
      {
        $match: {
          _organizationId: this.convertStringToObjectId(organizationId),
          _environmentId: this.convertStringToObjectId(environmentId),
          connectedAt: { $ne: null },
          disconnectedAt: null,
        },
      },
      {
        $lookup: {
          from: 'integrations',
          localField: '_integrationId',
          foreignField: '_id',
          as: 'integration',
        },
      },
      { $unwind: '$integration' },
      {
        $match: {
          'integration.deleted': { $ne: true },
        },
      },
      {
        $group: {
          _id: '$integration.providerId',
          firstConnectedAt: { $min: '$connectedAt' },
        },
      },
      { $sort: { firstConnectedAt: 1, _id: 1 } },
    ]);

    return (result as Array<{ _id: unknown }>).map((row) => String(row._id));
  }

  /**
   * Tombstones an active link instead of deleting it, so the inbound-webhook
   * heal can tell a deliberate disconnect apart from a never-linked orphan.
   * Returns the link as it was before the update, or null when no active link matched.
   */
  async softDisconnect({
    agentIntegrationId,
    agentId,
    environmentId,
    organizationId,
    session,
  }: {
    agentIntegrationId: string;
    agentId: string;
    environmentId: string;
    organizationId: string;
    session?: ClientSession | null;
  }): Promise<AgentIntegrationEntity | null> {
    return this.findOneAndUpdate(
      {
        _id: agentIntegrationId,
        _agentId: agentId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        disconnectedAt: null,
      },
      { $set: { disconnectedAt: new Date() } },
      { session }
    );
  }

  /**
   * Revives a tombstoned link for the same (agent, integration) pair when one
   * exists — the unique index makes a plain create fail — otherwise creates a
   * fresh link. `connectedAt` is reset on revival so the first inbound webhook
   * after reconnecting marks the link as connected again.
   */
  async createOrReviveLink({
    agentId,
    integrationId,
    environmentId,
    organizationId,
    session,
  }: {
    agentId: string;
    integrationId: string;
    environmentId: string;
    organizationId: string;
    session?: ClientSession | null;
  }): Promise<AgentIntegrationEntity> {
    const revived = await this.findOneAndUpdate(
      {
        _agentId: agentId,
        _integrationId: integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        disconnectedAt: { $ne: null },
      },
      { $set: { disconnectedAt: null, connectedAt: null } },
      { new: true, session }
    );

    if (revived) {
      return revived;
    }

    try {
      return await this.create(
        {
          _agentId: agentId,
          _integrationId: integrationId,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        { session }
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      /*
       * Race loser against the (_agentId, _integrationId, _environmentId)
       * unique index: a concurrent caller created the link between our revive
       * lookup and the insert. Re-read the winner's active row (the schema
       * pre-hook scopes findOne to disconnectedAt: null) and return it.
       */
      const existing = await this.findOne(
        {
          _agentId: agentId,
          _integrationId: integrationId,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        '*',
        { session }
      );

      if (existing) {
        return existing;
      }

      throw error;
    }
  }

  async findLinksForAgents({
    organizationId,
    environmentId,
    agentIds,
  }: {
    organizationId: string;
    environmentId: string;
    agentIds: string[];
  }) {
    if (agentIds.length === 0) {
      return [];
    }

    const query: FilterQuery<AgentIntegrationDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      _agentId: { $in: agentIds },
    };

    return this.find(query, ['_agentId', '_integrationId']);
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
