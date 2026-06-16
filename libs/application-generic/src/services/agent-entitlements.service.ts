import { Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, CommunityOrganizationRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  ResourceLimitSource,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { PinoLogger } from '../logging';
import { FeatureFlagsService } from './feature-flags';
import { resolveTierLimit } from './plan-limits';
import { SYSTEM_LIMITS } from './resource-validator.service';

/**
 * Grace slots beyond the plan limit that an organization may still create
 * (soft-blocked at runtime). Prevents unbounded agent creation on lower tiers
 * while keeping the "create now, upgrade later" flow.
 */
export const AGENT_CREATION_GRACE = 5;

/**
 * How long a runtime limit-check result may be served from memory. The runtime
 * gate is a soft block, so brief staleness after an upgrade/disconnect is
 * acceptable in exchange for not paying org + flag + count + aggregation
 * lookups on every inbound message.
 */
const RUNTIME_LIMIT_CACHE_TTL_MS = 30_000;
const RUNTIME_LIMIT_CACHE_MAX_ENTRIES = 10_000;

export interface AgentLimits {
  /** Active-agent limit for runtime responses (soft block). */
  planLimit: number;
  /** Hard cap on total agents (incl. inactive) the organization can create. */
  creationLimit: number;
  limitSource: ResourceLimitSource;
}

export interface AgentCreationAllowance {
  allowed: boolean;
  /** Total agents in the environment, including inactive ones. */
  totalCreated: number;
  creationLimit: number;
  limitSource: ResourceLimitSource;
}

export interface AgentPlanUsage {
  /** Number of active agents in the environment. Inactive agents do not consume slots. */
  used: number;
  limit: number;
  /**
   * Ids of the active agents that fall within the plan limit (oldest first).
   * `null` when the environment is not over its limit (or the limit is
   * unlimited), meaning every agent is within limit.
   */
  withinLimitAgentIds: string[] | null;
  /** Total agents in the environment, including inactive ones. */
  totalCreated: number;
  /** Hard cap on total agents the organization can create. */
  creationLimit: number;
  limitSource: ResourceLimitSource;
}

export interface RuntimeLimitChecks {
  agentWithinLimit: boolean;
  channelWithinLimit: boolean;
}

export interface ChannelPlanUsage {
  /** Number of connected channels (distinct integrations) in the environment. */
  used: number;
  limit: number;
  /**
   * Ids of the connected integrations that fall within the plan limit
   * (connection order). `null` when the environment is not over its limit (or
   * the limit is unlimited), meaning every connected channel is within limit.
   */
  withinLimitIntegrationIds: string[] | null;
  /**
   * Whether a channel that has not connected yet would be soft-blocked at
   * runtime. Mirrors the `isChannelWithinLimit` rule: at/over the limit an
   * unconnected channel has no reserved slot. Exposed here so consumers never
   * re-derive runtime semantics.
   */
  blocksUnconnectedChannels: boolean;
}

/**
 * Whether an agent is over the organization's plan limit (and therefore
 * soft-blocked at runtime). Inactive agents never consume slots — they're just
 * inactive, not over-limit.
 */
export function isAgentOverPlanLimit(usage: AgentPlanUsage, agent: { _id: string; active?: boolean }): boolean {
  if (!usage.withinLimitAgentIds || !agent.active) {
    return false;
  }

  return !usage.withinLimitAgentIds.includes(agent._id);
}

/**
 * Whether a channel is over the organization's active-channel plan limit (and
 * therefore soft-blocked at runtime). Unconnected channels have no reserved
 * slot and are blocked whenever the environment is at/over its limit.
 */
export function isChannelOverPlanLimit(
  usage: ChannelPlanUsage,
  channel: { integrationId: string; connected: boolean }
): boolean {
  if (!channel.connected) {
    return usage.blocksUnconnectedChannels;
  }

  return usage.withinLimitIntegrationIds !== null && !usage.withinLimitIntegrationIds.includes(channel.integrationId);
}

/**
 * Resolves per-organization entitlements for the Connect (Agents) product.
 *
 * Resolution follows the established platform pattern via `resolveTierLimit`:
 *   - Agents: `SYSTEM_LIMITS` default + LaunchDarkly override combined with the
 *     plan tier limit via `Math.min`. A LaunchDarkly value that differs from
 *     the system default is treated as a per-org override and wins.
 *   - Active channels: tier-table only (Enterprise is genuinely unlimited, no LD cap).
 *
 * Limits resolve at the organization level, but usage is counted per
 * environment (matching the workflow limit precedent): agents are created in
 * development and promoted to production via environment sync, so the same
 * logical agent exists as one document per environment. Counting org-wide would
 * double-charge every promoted agent/channel and rank production copies behind
 * all development agents at runtime.
 *
 * Self-hosted deployments are never limited here — the Connect product is gated
 * separately and community/on-prem editions must remain unaffected.
 */
@Injectable()
export class AgentEntitlementsService {
  private readonly runtimeLimitCache = new Map<string, { value: RuntimeLimitChecks; expiresAt: number }>();

  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  private get isSelfHosted(): boolean {
    return process.env.IS_SELF_HOSTED === 'true';
  }

  async getAgentLimit(organizationId: string): Promise<number> {
    const { planLimit } = await this.getAgentLimits(organizationId);

    return planLimit;
  }

  /**
   * Resolves the organization's agent limits in one shot:
   *   - `planLimit`: how many agents may be active (respond at runtime).
   *   - `creationLimit`: hard cap on total agents that can exist. For limited
   *     tiers this is `planLimit + AGENT_CREATION_GRACE`; for unlimited tiers
   *     (and LaunchDarkly per-org overrides) it is the system limit itself.
   *   - `limitSource`: `plan` when upgrading lifts the cap, `system` when only
   *     the Novu team can (system cap / LD override).
   */
  async getAgentLimits(organizationId: string, knownApiServiceLevel?: ApiServiceLevelEnum): Promise<AgentLimits> {
    if (this.isSelfHosted) {
      return { planLimit: UNLIMITED_VALUE, creationLimit: UNLIMITED_VALUE, limitSource: 'system' };
    }

    const apiServiceLevel = knownApiServiceLevel ?? (await this.getApiServiceLevel(organizationId));
    const { limit, systemLimit, limitSource } = await resolveTierLimit({
      featureFlagsService: this.featureFlagsService,
      flagKey: FeatureFlagsKeysEnum.MAX_AGENTS_LIMIT_NUMBER,
      systemDefault: SYSTEM_LIMITS.AGENTS,
      featureName: FeatureNameEnum.AGENT_MAX_AGENTS,
      organizationId,
      apiServiceLevel,
    });

    // System-sourced limits (per-org LD override or unlimited tier bounded by
    // the platform cap) are absolute — no grace buffer applies.
    if (limitSource === 'system') {
      return { planLimit: limit, creationLimit: limit, limitSource };
    }

    return {
      planLimit: limit,
      creationLimit: Math.min(limit + AGENT_CREATION_GRACE, systemLimit),
      limitSource,
    };
  }

  /**
   * Whether the organization may create one more agent in the environment.
   * Counts every agent in that environment, including inactive ones — the
   * creation cap is an anti-abuse measure, so deactivating agents frees runtime
   * slots but not creation slots. Counting is per environment so production
   * copies created by promotion (sync) don't exhaust the development cap.
   */
  async canCreateAgent(organizationId: string, environmentId: string): Promise<AgentCreationAllowance> {
    const { creationLimit, limitSource } = await this.getAgentLimits(organizationId);

    if (creationLimit >= UNLIMITED_VALUE) {
      return { allowed: true, totalCreated: 0, creationLimit, limitSource };
    }

    const totalCreated = await this.agentRepository.countTotalInEnvironment(organizationId, environmentId);

    return { allowed: totalCreated < creationLimit, totalCreated, creationLimit, limitSource };
  }

  async getActiveChannelLimit(organizationId: string, knownApiServiceLevel?: ApiServiceLevelEnum): Promise<number> {
    if (this.isSelfHosted) {
      return UNLIMITED_VALUE;
    }

    const apiServiceLevel = knownApiServiceLevel ?? (await this.getApiServiceLevel(organizationId));

    return getFeatureForTierAsNumber(FeatureNameEnum.AGENT_MAX_ACTIVE_CHANNELS, apiServiceLevel);
  }

  /**
   * Resolves the organization's active-conversations / month limit straight from
   * the plan tier table — no platform/system cap and no per-org LaunchDarkly
   * override. A value `>= UNLIMITED_VALUE` means unlimited (Enterprise/Unlimited
   * tiers): paid customers are never capped, only Free is short-circuited.
   * Counting still runs self-hosted, but the limit is never binding there.
   */
  async getActiveConversationsLimit(
    organizationId: string,
    knownApiServiceLevel?: ApiServiceLevelEnum
  ): Promise<number> {
    if (this.isSelfHosted) {
      return UNLIMITED_VALUE;
    }

    const apiServiceLevel = knownApiServiceLevel ?? (await this.getApiServiceLevel(organizationId));

    return getFeatureForTierAsNumber(FeatureNameEnum.AGENT_MAX_ACTIVE_CONVERSATIONS, apiServiceLevel);
  }

  /**
   * Snapshot of the environment's agent usage against the organization's plan
   * limit, including which agents are within limit when the environment is over
   * it. Limits resolve at the organization level; usage counts per environment
   * so promoted (synced) production copies don't double-count against the plan.
   * Used by the dashboard to surface over-limit agents that are soft-blocked at
   * runtime.
   */
  async getAgentPlanUsage(organizationId: string, environmentId: string): Promise<AgentPlanUsage> {
    const [limits, used, totalCreated] = await Promise.all([
      this.getAgentLimits(organizationId),
      this.agentRepository.countActiveInEnvironment(organizationId, environmentId),
      this.agentRepository.countTotalInEnvironment(organizationId, environmentId),
    ]);
    const { planLimit: limit, creationLimit, limitSource } = limits;
    const base = { used, limit, totalCreated, creationLimit, limitSource };

    // System caps are enforced at creation only — existing agents are never
    // flagged as over-limit, even if the cap was lowered below current usage.
    if (limitSource === 'system' || limit >= UNLIMITED_VALUE || used <= limit) {
      return { ...base, withinLimitAgentIds: null };
    }

    const withinLimitAgentIds = await this.agentRepository.findOldestAgentIds(organizationId, environmentId, limit);

    return { ...base, withinLimitAgentIds };
  }

  /**
   * Snapshot of the environment's connected-channel usage against the
   * organization's plan limit, including which channels are within limit when
   * the environment is over it. Used by the dashboard to surface over-limit
   * channels that are soft-blocked at runtime.
   */
  async getChannelPlanUsage(organizationId: string, environmentId: string): Promise<ChannelPlanUsage> {
    const [limit, connectedIntegrationIds] = await Promise.all([
      this.getActiveChannelLimit(organizationId),
      this.agentIntegrationRepository.listConnectedIntegrationIdsForEnvironment(organizationId, environmentId),
    ]);
    const used = connectedIntegrationIds.length;

    if (limit >= UNLIMITED_VALUE) {
      return { used, limit, withinLimitIntegrationIds: null, blocksUnconnectedChannels: false };
    }

    const blocksUnconnectedChannels = used >= limit;

    if (used <= limit) {
      return { used, limit, withinLimitIntegrationIds: null, blocksUnconnectedChannels };
    }

    return {
      used,
      limit,
      withinLimitIntegrationIds: connectedIntegrationIds.slice(0, limit),
      blocksUnconnectedChannels,
    };
  }

  /**
   * Whether the given agent is within the organization's plan limit, ranked
   * among the active agents of its own environment. Agents created beyond the
   * limit (by creation order among active agents) are "over-limit" and should
   * be soft-blocked at runtime rather than rejected at creation time. Inactive
   * agents do not consume slots, so deactivating an older agent frees a slot
   * for newer ones. Callers are expected to pass an active agent — inactive
   * agents don't respond regardless of plan limits.
   *
   * System caps (unlimited tiers bounded by the platform limit, or per-org
   * overrides) are enforced at creation only and never soft-block existing
   * agents — only plan limits do.
   */
  async isAgentWithinLimit(
    organizationId: string,
    environmentId: string,
    agentId: string,
    knownApiServiceLevel?: ApiServiceLevelEnum
  ): Promise<boolean> {
    const { planLimit: limit, limitSource } = await this.getAgentLimits(organizationId, knownApiServiceLevel);
    if (limitSource === 'system' || limit >= UNLIMITED_VALUE) {
      return true;
    }

    const rank = await this.agentRepository.countOlderAgentsInEnvironment(organizationId, environmentId, agentId);

    return rank < limit;
  }

  /**
   * Combined agent + channel runtime limit check for the inbound hot path.
   * Resolves the organization's service level once and shares it across both
   * checks instead of each issuing its own organization lookup.
   *
   * Contractually non-throwing: any lookup failure is logged and fails open
   * (all-within-limit) so a transient error never silently disables a paying
   * customer's agent. Results are cached for a short TTL — the runtime gate is
   * a soft block, so brief staleness is acceptable and saves the org, flag and
   * usage lookups on every inbound message.
   */
  async checkRuntimeLimits(
    organizationId: string,
    environmentId: string,
    agentId: string,
    integrationId: string
  ): Promise<RuntimeLimitChecks> {
    if (this.isSelfHosted) {
      return { agentWithinLimit: true, channelWithinLimit: true };
    }

    const cacheKey = `${organizationId}:${environmentId}:${agentId}:${integrationId}`;
    const cached = this.runtimeLimitCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const apiServiceLevel = await this.getApiServiceLevel(organizationId);
      const [agentWithinLimit, channelWithinLimit] = await Promise.all([
        this.isAgentWithinLimit(organizationId, environmentId, agentId, apiServiceLevel),
        this.isChannelWithinLimit(organizationId, environmentId, integrationId, apiServiceLevel),
      ]);
      const value = { agentWithinLimit, channelWithinLimit };

      this.setRuntimeLimitCacheEntry(cacheKey, value);

      return value;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId, agentId, integrationId },
        'Failed to evaluate runtime plan limits; failing open (all within limit)'
      );

      // Transient failures are not cached so the next message re-evaluates.
      return { agentWithinLimit: true, channelWithinLimit: true };
    }
  }

  /**
   * Whether the given channel integration is within the organization's active
   * channel limit, by connection order within its environment. Channels
   * connected beyond the limit are soft-blocked at runtime.
   */
  async isChannelWithinLimit(
    organizationId: string,
    environmentId: string,
    integrationId: string,
    knownApiServiceLevel?: ApiServiceLevelEnum
  ): Promise<boolean> {
    const limit = await this.getActiveChannelLimit(organizationId, knownApiServiceLevel);
    if (limit >= UNLIMITED_VALUE) {
      return true;
    }

    const connectedIntegrationIds = await this.agentIntegrationRepository.listConnectedIntegrationIdsForEnvironment(
      organizationId,
      environmentId
    );
    const rank = connectedIntegrationIds.indexOf(integrationId);

    if (rank === -1) {
      // Not yet recorded as connected — allow only if there is remaining headroom.
      return connectedIntegrationIds.length < limit;
    }

    return rank < limit;
  }

  private setRuntimeLimitCacheEntry(cacheKey: string, value: RuntimeLimitChecks): void {
    // Crude bound: the cache key space is per agent+integration, so an
    // unbounded map could grow with tenant count. Dropping everything is fine —
    // entries rebuild on the next message.
    if (this.runtimeLimitCache.size >= RUNTIME_LIMIT_CACHE_MAX_ENTRIES) {
      this.runtimeLimitCache.clear();
    }

    this.runtimeLimitCache.set(cacheKey, { value, expiresAt: Date.now() + RUNTIME_LIMIT_CACHE_TTL_MS });
  }

  async getApiServiceLevel(organizationId: string): Promise<ApiServiceLevelEnum> {
    const organization = await this.organizationRepository.findById(organizationId, '_id apiServiceLevel');

    return organization?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  }
}
