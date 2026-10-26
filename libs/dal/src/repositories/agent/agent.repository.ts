import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';

import type { EnforceEnvOrOrgIds } from '../../types';
import { SortOrder } from '../../types/sort-order';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { AgentAwake, AgentDBModel, AgentEntity } from './agent.entity';
import { Agent } from './agent.schema';

/**
 * The Human relay is delivery infrastructure, not a customer agent. Plan-usage
 * counts skip it so a Human setup does not consume a Novu plan slot.
 */
const NOT_HUMAN_RELAY = { runtime: { $ne: 'human_relay' as const } };

export class AgentRepository extends BaseRepositoryV2<AgentDBModel, AgentEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Agent, AgentEntity);
  }

  /**
   * Number of active agents in the environment. Plan-limit usage is counted per
   * environment so a dev agent promoted (synced) to production does not consume
   * a second plan slot for the same logical agent. Inactive agents and the
   * Human relay do not consume plan-limit slots.
   */
  async countActiveInEnvironment(organizationId: string, environmentId: string): Promise<number> {
    return this.count({
      _organizationId: organizationId,
      _environmentId: environmentId,
      active: true,
      ...NOT_HUMAN_RELAY,
    });
  }

  /**
   * Total number of agents in the environment, including inactive ones. Used
   * for the hard creation cap — counting inactive agents too prevents bypassing
   * the cap via create/deactivate loops. Scoped per environment so promoted
   * production copies don't exhaust the cap for new creations in development.
   * The Human relay is excluded.
   */
  async countTotalInEnvironment(organizationId: string, environmentId: string): Promise<number> {
    return this.count({
      _organizationId: organizationId,
      _environmentId: environmentId,
      ...NOT_HUMAN_RELAY,
    });
  }

  /**
   * Number of active agents in the environment created before the given agent,
   * using `_id` (monotonic with creation time) as the ordering key. This is the
   * agent's zero-based rank among active agents and is used for plan-limit
   * enforcement; inactive agents and the Human relay do not consume slots.
   */
  async countOlderAgentsInEnvironment(organizationId: string, environmentId: string, agentId: string): Promise<number> {
    return this.count({
      _organizationId: organizationId,
      _environmentId: environmentId,
      active: true,
      _id: { $lt: this.convertStringToObjectId(agentId) },
      ...NOT_HUMAN_RELAY,
    });
  }

  /**
   * Ids of the oldest `limit` active agents in the environment, using `_id`
   * (monotonic with creation time) as the ordering key. These are the agents
   * that fall within the plan limit; any other active agent in the environment
   * is over-limit. Inactive agents and the Human relay do not consume slots.
   */
  async findOldestAgentIds(organizationId: string, environmentId: string, limit: number): Promise<string[]> {
    if (limit <= 0) {
      return [];
    }

    const agents = await this.find(
      { _organizationId: organizationId, _environmentId: environmentId, active: true, ...NOT_HUMAN_RELAY },
      ['_id'],
      {
        sort: { _id: 1 },
        limit,
      }
    );

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
      // System relay agents (human-in-the-loop delivery) are infrastructure,
      // never user-facing inventory.
      runtime: { $ne: 'human_relay' },
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

  /**
   * Takes the lease that keeps a Human relay agent awake for `holder`, a computer and the host it wakes there:
   * when nobody holds a live one, when that same computer and host hold it already (a renewal), or with
   * `takeOver` from whoever holds it. The same computer with another host is another holder. One conditional
   * write decides, so of two asking at once only one gets it. A renewal keeps `since`; anything else starts it
   * anew. Returns the lease as stored, or `null` when another holder has a live one and `takeOver` isn't set.
   */
  async takeAwake(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    holder: Pick<AgentAwake, 'computerId' | 'computerName' | 'host' | 'project'>;
    takeOver: boolean;
    now: Date;
    leaseMs: number;
  }): Promise<AgentAwake | null> {
    const { holder } = params;
    const now = params.now.toISOString();
    const free = {
      $or: [
        { 'awake.expiresAt': { $exists: false } },
        { 'awake.expiresAt': { $lte: now } },
        { 'awake.computerId': holder.computerId, 'awake.host': holder.host },
      ],
    };
    // An update pipeline, so the same write can keep `since` for the holder renewing it. What the CLI sent goes
    // in as `$literal`: in a pipeline a string that starts with `$` would be read as a field of the agent.
    const renewing = {
      $and: [
        { $eq: ['$awake.computerId', { $literal: holder.computerId }] },
        { $eq: ['$awake.host', { $literal: holder.host }] },
        { $gt: ['$awake.expiresAt', now] },
      ],
    };
    const awake = {
      computerId: { $literal: holder.computerId },
      computerName: { $literal: holder.computerName },
      host: { $literal: holder.host },
      ...(holder.project ? { project: { $literal: holder.project } } : {}),
      since: { $cond: [renewing, '$awake.since', now] },
      renewedAt: now,
      expiresAt: new Date(params.now.getTime() + params.leaseMs).toISOString(),
    };

    const updated = await this.MongooseModel.findOneAndUpdate(
      {
        _id: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        ...(params.takeOver ? {} : free),
      },
      // `$mergeObjects` builds a new document, so nothing of the last holder's, such as its project, stays behind.
      [{ $set: { awake: { $mergeObjects: [awake] } } }],
      { new: true, projection: { awake: 1 }, timestamps: false }
    ).lean();

    return updated?.awake ?? null;
  }

  /**
   * Lets go of the lease when `holder`, a computer and its host, holds it, live or lapsed. Says whether it held a
   * live one: another holder's lease is never touched, and a lapsed one was no lease anymore.
   */
  async releaseAwake(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    holder: Pick<AgentAwake, 'computerId' | 'host'>;
    now: Date;
  }): Promise<boolean> {
    const before = await this.findOneAndUpdate(
      {
        _id: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        'awake.computerId': params.holder.computerId,
        'awake.host': params.holder.host,
      },
      { $unset: { awake: '' } },
      { projection: { awake: 1 }, timestamps: false }
    );
    const expiresAt = before?.awake?.expiresAt;

    return Boolean(expiresAt && expiresAt > params.now.toISOString());
  }
}
