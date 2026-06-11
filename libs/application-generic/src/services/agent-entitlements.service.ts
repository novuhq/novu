import { Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, CommunityOrganizationRepository } from '@novu/dal';
import {
  ApiServiceLevelEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  UNLIMITED_VALUE,
} from '@novu/shared';
import { FeatureFlagsService } from './feature-flags';
import { SYSTEM_LIMITS } from './resource-validator.service';

export interface AgentEntitlementUsage {
  used: number;
  limit: number;
  isWithinLimit: boolean;
}

/**
 * Which constraint produced an agent limit. Drives user-facing messaging:
 * `plan` limits are solved by upgrading; `system` limits (the platform-wide
 * cap, or a per-org LaunchDarkly override) require contacting the Novu team.
 */
export type AgentLimitSource = 'plan' | 'system';

/**
 * Grace slots beyond the plan limit that an organization may still create
 * (soft-blocked at runtime). Prevents unbounded agent creation on lower tiers
 * while keeping the "create now, upgrade later" flow.
 */
export const AGENT_CREATION_GRACE = 2;

export interface AgentLimits {
  /** Active-agent limit for runtime responses (soft block). */
  planLimit: number;
  /** Hard cap on total agents (incl. inactive) the organization can create. */
  creationLimit: number;
  limitSource: AgentLimitSource;
}

export interface AgentCreationAllowance {
  allowed: boolean;
  /** Total agents in the organization, including inactive ones. */
  totalCreated: number;
  creationLimit: number;
  limitSource: AgentLimitSource;
}

export interface AgentPlanUsage {
  /** Number of active agents in the organization. Inactive agents do not consume slots. */
  used: number;
  limit: number;
  /**
   * Ids of the active agents that fall within the plan limit (oldest first).
   * `null` when the organization is not over its limit (or the limit is
   * unlimited), meaning every agent is within limit.
   */
  withinLimitAgentIds: string[] | null;
  /** Total agents in the organization, including inactive ones. */
  totalCreated: number;
  /** Hard cap on total agents the organization can create. */
  creationLimit: number;
  limitSource: AgentLimitSource;
}

export interface CustomEmailDomainLimits {
  limit: number;
  limitSource: AgentLimitSource;
}

export interface RuntimeLimitChecks {
  agentWithinLimit: boolean;
  channelWithinLimit: boolean;
}

export interface ChannelPlanUsage {
  /** Number of connected channels (distinct integrations) in the organization. */
  used: number;
  limit: number;
  /**
   * Ids of the connected integrations that fall within the plan limit
   * (connection order). `null` when the organization is not over its limit (or
   * the limit is unlimited), meaning every connected channel is within limit.
   */
  withinLimitIntegrationIds: string[] | null;
}

/**
 * Resolves per-organization entitlements for the Connect (Agents) product.
 *
 * Resolution follows the established platform pattern:
 *   - Agents & custom email domains: `SYSTEM_LIMITS` default + LaunchDarkly override
 *     combined with the plan tier limit via `Math.min`. A LaunchDarkly value that
 *     differs from the system default is treated as a per-org override and wins.
 *   - Active channels: tier-table only (Enterprise is genuinely unlimited, no LD cap).
 *
 * Self-hosted deployments are never limited here — the Connect product is gated
 * separately and community/on-prem editions must remain unaffected.
 */
@Injectable()
export class AgentEntitlementsService {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

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
    const systemLimit = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_AGENTS_LIMIT_NUMBER,
      defaultValue: SYSTEM_LIMITS.AGENTS,
      organization: { _id: organizationId, apiServiceLevel },
    });

    // A LaunchDarkly value differing from the system default is a deliberate
    // per-org ceiling — it replaces both the tier limit and the grace buffer.
    const isSpecialLimit = systemLimit !== SYSTEM_LIMITS.AGENTS;
    if (isSpecialLimit) {
      return { planLimit: systemLimit, creationLimit: systemLimit, limitSource: 'system' };
    }

    const tierLimit = getFeatureForTierAsNumber(FeatureNameEnum.AGENT_MAX_AGENTS, apiServiceLevel);

    // Unlimited tiers (Enterprise/Unlimited) are bounded only by the system cap.
    if (tierLimit >= UNLIMITED_VALUE) {
      return { planLimit: systemLimit, creationLimit: systemLimit, limitSource: 'system' };
    }

    const planLimit = Math.min(systemLimit, tierLimit);

    return {
      planLimit,
      creationLimit: Math.min(planLimit + AGENT_CREATION_GRACE, systemLimit),
      limitSource: 'plan',
    };
  }

  /**
   * Whether the organization may create one more agent. Counts every agent,
   * including inactive ones — the creation cap is an anti-abuse measure, so
   * deactivating agents frees runtime slots but not creation slots.
   */
  async canCreateAgent(organizationId: string): Promise<AgentCreationAllowance> {
    const { creationLimit, limitSource } = await this.getAgentLimits(organizationId);

    if (creationLimit >= UNLIMITED_VALUE) {
      return { allowed: true, totalCreated: 0, creationLimit, limitSource };
    }

    const totalCreated = await this.agentRepository.countTotalByOrganization(organizationId);

    return { allowed: totalCreated < creationLimit, totalCreated, creationLimit, limitSource };
  }

  async getActiveChannelLimit(organizationId: string, knownApiServiceLevel?: ApiServiceLevelEnum): Promise<number> {
    if (this.isSelfHosted) {
      return UNLIMITED_VALUE;
    }

    const apiServiceLevel = knownApiServiceLevel ?? (await this.getApiServiceLevel(organizationId));

    return getFeatureForTierAsNumber(FeatureNameEnum.AGENT_MAX_ACTIVE_CHANNELS, apiServiceLevel);
  }

  async getCustomEmailDomainLimit(organizationId: string): Promise<number> {
    const { limit } = await this.getCustomEmailDomainLimits(organizationId);

    return limit;
  }

  /**
   * Resolves the organization's custom email domain limit together with its
   * source. Mirrors `getAgentLimits`: `plan` limits are lifted by upgrading,
   * `system` limits (the platform-wide cap, a per-org LaunchDarkly override,
   * or an unlimited tier bounded only by the system cap) require contacting
   * the Novu team.
   */
  async getCustomEmailDomainLimits(organizationId: string): Promise<CustomEmailDomainLimits> {
    if (this.isSelfHosted) {
      return { limit: UNLIMITED_VALUE, limitSource: 'system' };
    }

    const apiServiceLevel = await this.getApiServiceLevel(organizationId);
    const systemLimit = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_CUSTOM_EMAIL_DOMAINS_NUMBER,
      defaultValue: SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS,
      organization: { _id: organizationId, apiServiceLevel },
    });

    // A LaunchDarkly value differing from the system default is a deliberate
    // per-org ceiling — only the Novu team can change it.
    const isSpecialLimit = systemLimit !== SYSTEM_LIMITS.CUSTOM_EMAIL_DOMAINS;
    if (isSpecialLimit) {
      return { limit: systemLimit, limitSource: 'system' };
    }

    const tierLimit = getFeatureForTierAsNumber(FeatureNameEnum.AGENT_MAX_CUSTOM_EMAIL_DOMAINS, apiServiceLevel);

    // Unlimited tiers (Team/Enterprise) are bounded only by the system cap.
    if (tierLimit >= UNLIMITED_VALUE) {
      return { limit: systemLimit, limitSource: 'system' };
    }

    return { limit: Math.min(systemLimit, tierLimit), limitSource: 'plan' };
  }

  async getAgentUsage(organizationId: string): Promise<AgentEntitlementUsage> {
    const [limit, used] = await Promise.all([
      this.getAgentLimit(organizationId),
      this.agentRepository.countByOrganization(organizationId),
    ]);

    return { used, limit, isWithinLimit: used <= limit };
  }

  async getActiveChannelUsage(organizationId: string): Promise<AgentEntitlementUsage> {
    const [limit, connectedIntegrationIds] = await Promise.all([
      this.getActiveChannelLimit(organizationId),
      this.agentIntegrationRepository.listConnectedIntegrationIdsForOrganization(organizationId),
    ]);
    const used = connectedIntegrationIds.length;

    return { used, limit, isWithinLimit: used <= limit };
  }

  /**
   * Snapshot of the organization's agent usage against its plan limit,
   * including which agents are within limit when the org is over it. Used by
   * the dashboard to surface over-limit agents that are soft-blocked at runtime.
   */
  async getAgentPlanUsage(organizationId: string): Promise<AgentPlanUsage> {
    const [limits, used, totalCreated] = await Promise.all([
      this.getAgentLimits(organizationId),
      this.agentRepository.countByOrganization(organizationId),
      this.agentRepository.countTotalByOrganization(organizationId),
    ]);
    const { planLimit: limit, creationLimit, limitSource } = limits;
    const base = { used, limit, totalCreated, creationLimit, limitSource };

    // System caps are enforced at creation only — existing agents are never
    // flagged as over-limit, even if the cap was lowered below current usage.
    if (limitSource === 'system' || limit >= UNLIMITED_VALUE || used <= limit) {
      return { ...base, withinLimitAgentIds: null };
    }

    const withinLimitAgentIds = await this.agentRepository.findOldestAgentIds(organizationId, limit);

    return { ...base, withinLimitAgentIds };
  }

  /**
   * Snapshot of the organization's connected-channel usage against its plan
   * limit, including which channels are within limit when the org is over it.
   * Used by the dashboard to surface over-limit channels that are soft-blocked
   * at runtime.
   */
  async getChannelPlanUsage(organizationId: string): Promise<ChannelPlanUsage> {
    const [limit, connectedIntegrationIds] = await Promise.all([
      this.getActiveChannelLimit(organizationId),
      this.agentIntegrationRepository.listConnectedIntegrationIdsForOrganization(organizationId),
    ]);
    const used = connectedIntegrationIds.length;

    if (limit >= UNLIMITED_VALUE || used <= limit) {
      return { used, limit, withinLimitIntegrationIds: null };
    }

    return { used, limit, withinLimitIntegrationIds: connectedIntegrationIds.slice(0, limit) };
  }

  /**
   * Whether the given agent is within the organization's plan limit. Agents
   * created beyond the limit (by creation order among active agents) are
   * "over-limit" and should be soft-blocked at runtime rather than rejected at
   * creation time. Inactive agents do not consume slots, so deactivating an
   * older agent frees a slot for newer ones. Callers are expected to pass an
   * active agent — inactive agents don't respond regardless of plan limits.
   *
   * System caps (unlimited tiers bounded by the platform limit, or per-org
   * overrides) are enforced at creation only and never soft-block existing
   * agents — only plan limits do.
   */
  async isAgentWithinLimit(
    organizationId: string,
    agentId: string,
    knownApiServiceLevel?: ApiServiceLevelEnum
  ): Promise<boolean> {
    const { planLimit: limit, limitSource } = await this.getAgentLimits(organizationId, knownApiServiceLevel);
    if (limitSource === 'system' || limit >= UNLIMITED_VALUE) {
      return true;
    }

    const rank = await this.agentRepository.countOlderAgentsInOrganization(organizationId, agentId);

    return rank < limit;
  }

  /**
   * Combined agent + channel runtime limit check for the inbound hot path.
   * Resolves the organization's service level once and shares it across both
   * checks instead of each issuing its own organization lookup.
   */
  async checkRuntimeLimits(
    organizationId: string,
    agentId: string,
    integrationId: string
  ): Promise<RuntimeLimitChecks> {
    if (this.isSelfHosted) {
      return { agentWithinLimit: true, channelWithinLimit: true };
    }

    const apiServiceLevel = await this.getApiServiceLevel(organizationId);
    const [agentWithinLimit, channelWithinLimit] = await Promise.all([
      this.isAgentWithinLimit(organizationId, agentId, apiServiceLevel),
      this.isChannelWithinLimit(organizationId, integrationId, apiServiceLevel),
    ]);

    return { agentWithinLimit, channelWithinLimit };
  }

  /**
   * Whether the given channel integration is within the organization's active
   * channel limit, by connection order. Channels connected beyond the limit are
   * soft-blocked at runtime.
   */
  async isChannelWithinLimit(
    organizationId: string,
    integrationId: string,
    knownApiServiceLevel?: ApiServiceLevelEnum
  ): Promise<boolean> {
    const limit = await this.getActiveChannelLimit(organizationId, knownApiServiceLevel);
    if (limit >= UNLIMITED_VALUE) {
      return true;
    }

    const connectedIntegrationIds =
      await this.agentIntegrationRepository.listConnectedIntegrationIdsForOrganization(organizationId);
    const rank = connectedIntegrationIds.indexOf(integrationId);

    if (rank === -1) {
      // Not yet recorded as connected — allow only if there is remaining headroom.
      return connectedIntegrationIds.length < limit;
    }

    return rank < limit;
  }

  private async getApiServiceLevel(organizationId: string): Promise<ApiServiceLevelEnum> {
    const organization = await this.organizationRepository.findById(organizationId, '_id apiServiceLevel');

    return organization?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  }
}
