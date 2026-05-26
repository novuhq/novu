import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  FeatureFlagsService,
  PinoLogger,
  shortId,
} from '@novu/application-generic';
import { ChannelEndpointRepository, CommunityOrganizationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelEndpointType, ENDPOINT_TYPES, FeatureFlagsKeysEnum, OrganizationProductTypeEnum } from '@novu/shared';
import { CreateChannelEndpointCommand } from '../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { captureAgentWarning } from '../utils/capture-agent-sentry';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../utils/email-normalization';
import { getPhoneLookupCandidates } from '../utils/phone-normalization';
import { PLATFORM_ENDPOINT_CONFIG } from '../utils/platform-endpoint-config';

/**
 * Sentinel value written to `subscriber.data.__novu_source` for every
 * subscriber the resolver auto-creates from an inbound platform message.
 * The countability cap (and the sparse index that backs it) relies on this
 * marker — never mutate the value without coordinating both.
 */
export const AGENT_PLATFORM_PROVISION_SOURCE = 'agent-platform-provision' as const;

/** Default cap applied to Connect orgs when LaunchDarkly does not override. */
export const DEFAULT_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_LIMIT = 25;

/**
 * Platforms whose inbound message path auto-provisions a Subscriber when the
 * platform identity is unrecognised. Everything else (WhatsApp by phone,
 * Email by address, Telegram via `/start` deep-link) keeps its existing
 * lookup-only semantics.
 */
const PROVISIONABLE_PLATFORMS: ReadonlySet<AgentPlatformEnum> = new Set([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
]);

export interface ResolveSubscriberParams {
  environmentId: string;
  organizationId: string;
  platform: AgentPlatformEnum;
  platformUserId: string;
  integrationIdentifier: string;
}

export interface ResolveOrProvisionParams extends ResolveSubscriberParams {
  /** External agent identifier; persisted on the provenance blob. */
  agentIdentifier: string;
  /** Platform-supplied display name; used as `firstName` on the new Subscriber. */
  authorFullName?: string | null;
  /** Platform-supplied username (Slack handle, Teams userPrincipalName); fallback for `firstName`. */
  authorUserName?: string | null;
  /** True when the inbound message is itself from another bot — resolver short-circuits. */
  authorIsBot?: boolean;
}

/**
 * Thrown when the inbound author is itself a bot. `AgentInboundHandler` swallows
 * this and no-ops the turn — bots reacting to other bots are not a useful
 * provisioning signal and the LLM dispatch would just burn tokens.
 */
export class BotAuthorSkippedError extends Error {
  constructor(
    public readonly platform: AgentPlatformEnum,
    public readonly platformUserId: string
  ) {
    super(`Inbound from bot author skipped: platform=${platform} userId=${platformUserId}`);
    this.name = 'BotAuthorSkippedError';
  }
}

/**
 * Thrown when a Connect-product org has hit the auto-provisioned-subscriber
 * cap. `AgentInboundHandler` catches this and surfaces a tier-upgrade message
 * to the inbound user; no LLM dispatch fires.
 */
export class ConnectOrgSubscriberCapExceededError extends Error {
  constructor(
    public readonly organizationId: string,
    public readonly count: number,
    public readonly limit: number
  ) {
    super(`Connect organization ${organizationId} reached auto-provisioned subscriber cap (${count}/${limit}).`);
    this.name = 'ConnectOrgSubscriberCapExceededError';
  }
}

@Injectable()
export class AgentSubscriberResolver {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase,
    private readonly createChannelEndpoint: CreateChannelEndpoint,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Pure platform-identity lookup. Returns the linked subscriberId or `null`
   * when no link exists. Safe for read-only callers (reactions, actions, and
   * platforms outside the auto-provision scope).
   */
  async resolveOnly(params: ResolveSubscriberParams): Promise<string | null> {
    const { environmentId, organizationId, platform, platformUserId, integrationIdentifier } = params;

    if (!platformUserId.trim()) {
      return null;
    }

    if (platform === AgentPlatformEnum.WHATSAPP) {
      return this.resolveWhatsAppSubscriber({
        environmentId,
        organizationId,
        platformUserId,
      });
    }

    if (platform === AgentPlatformEnum.EMAIL) {
      return this.resolveEmailSubscriber({
        environmentId,
        organizationId,
        platformUserId,
      });
    }

    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[platform];

    if (!endpointConfig) {
      this.logger.debug(
        `No endpoint config for platform ${platform} — subscriber resolution skipped (integration: ${integrationIdentifier})`
      );

      return null;
    }

    const endpoint = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: environmentId,
      _organizationId: organizationId,
      integrationIdentifier,
      type: endpointConfig.endpointType,
      endpointField: endpointConfig.identityField,
      endpointValue: platformUserId,
    });

    if (endpoint) {
      this.logger.debug(`Resolved platform user ${platform}:${platformUserId} → subscriber ${endpoint.subscriberId}`);

      return endpoint.subscriberId;
    }

    this.logger.debug(
      `No subscriber linked for platform user ${platform}:${platformUserId} (integration: ${integrationIdentifier})`
    );

    return null;
  }

  /**
   * Lookup-or-provision for Slack/Teams inbound text messages.
   *
   * Branches:
   *   - Hit on lookup → return existing subscriberId.
   *   - Miss + author is a bot → throw `BotAuthorSkippedError`.
   *   - Miss + Connect org at cap → throw `ConnectOrgSubscriberCapExceededError`.
   *   - Miss otherwise → upsert Subscriber + ChannelEndpoint (race-safe via the
   *     `unique_platform_user_per_integration` partial index) and return the
   *     new subscriberId. On E11000, re-read the winner row and return its id;
   *     the orphan Subscriber is logged but left in place.
   *
   * Throws an internal error for non-provisionable platforms; callers MUST
   * route reactions, actions, and non-Slack/Teams inbound through `resolveOnly`.
   */
  async resolveOrProvision(params: ResolveOrProvisionParams): Promise<string> {
    if (!PROVISIONABLE_PLATFORMS.has(params.platform)) {
      throw new Error(
        `resolveOrProvision called for unsupported platform "${params.platform}". Route through resolveOnly instead.`
      );
    }

    const existing = await this.resolveOnly(params);
    if (existing) {
      return existing;
    }

    if (params.authorIsBot) {
      this.analyticsService.track('[Agent Platform] - Bot author inbound skipped', 'system', {
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        platform: params.platform,
        agentIdentifier: params.agentIdentifier,
      });
      throw new BotAuthorSkippedError(params.platform, params.platformUserId);
    }

    const productType = await this.getOrganizationProductType(params.organizationId);

    if (productType === OrganizationProductTypeEnum.CONNECT) {
      await this.assertCapNotReached(params);
    }

    return this.provisionSubscriberAndEndpoint(params, productType);
  }

  private async resolveWhatsAppSubscriber(params: {
    environmentId: string;
    organizationId: string;
    platformUserId: string;
  }): Promise<string | null> {
    const { environmentId, organizationId, platformUserId } = params;
    const phoneCandidates = getPhoneLookupCandidates(platformUserId);
    const matches = await this.subscriberRepository.findByPhone(environmentId, organizationId, phoneCandidates);

    if (matches.length > 1) {
      this.logger.warn(
        `Multiple subscribers (${matches.length}) share phone ${platformUserId} in environment ${environmentId} — using first match`
      );
    }

    const subscriber = matches[0];

    if (subscriber) {
      this.logger.debug(`Resolved WhatsApp phone ${platformUserId} → subscriber ${subscriber.subscriberId}`);

      return subscriber.subscriberId;
    }

    this.logger.debug(`No subscriber found for WhatsApp phone ${platformUserId}`);

    return null;
  }

  private async resolveEmailSubscriber(params: {
    environmentId: string;
    organizationId: string;
    platformUserId: string;
  }): Promise<string | null> {
    const { environmentId, organizationId, platformUserId } = params;
    const email = normalizeEmailForLookup(platformUserId);

    if (!isValidEmailForLookup(email)) {
      this.logger.debug(`Skipping email subscriber lookup for invalid address "${platformUserId}"`);

      return null;
    }

    const matches = await this.subscriberRepository.findByEmail(environmentId, organizationId, email);

    if (matches.length > 1) {
      this.logger.warn(
        `Multiple subscribers (${matches.length}) share email ${email} in environment ${environmentId} — using first match`
      );
    }

    const subscriber = matches[0];

    if (subscriber) {
      this.logger.debug(`Resolved email ${email} → subscriber ${subscriber.subscriberId}`);

      return subscriber.subscriberId;
    }

    this.logger.debug(`No subscriber found for email ${email}`);

    return null;
  }

  private async getOrganizationProductType(organizationId: string): Promise<OrganizationProductTypeEnum | undefined> {
    const organization = await this.organizationRepository.findById(organizationId);

    return organization?.productType ?? undefined;
  }

  private async assertCapNotReached(params: ResolveOrProvisionParams): Promise<void> {
    const limit = await this.featureFlagsService.getFlag<number>({
      key: FeatureFlagsKeysEnum.MAX_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_NUMBER,
      defaultValue: DEFAULT_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_LIMIT,
      organization: { _id: params.organizationId },
    });

    const count = await this.subscriberRepository.count(
      {
        _organizationId: params.organizationId,
        'data.__novu_source': AGENT_PLATFORM_PROVISION_SOURCE,
      },
      limit + 1
    );

    if (count >= limit) {
      this.analyticsService.track('[Agent Platform] - Connect org subscriber cap reached', 'system', {
        organizationId: params.organizationId,
        environmentId: params.environmentId,
        platform: params.platform,
        agentIdentifier: params.agentIdentifier,
        count,
        limit,
      });

      throw new ConnectOrgSubscriberCapExceededError(params.organizationId, count, limit);
    }
  }

  private async provisionSubscriberAndEndpoint(
    params: ResolveOrProvisionParams,
    productType: OrganizationProductTypeEnum | undefined
  ): Promise<string> {
    const subscriberId = `sub_${shortId(12)}`;
    const firstName = params.authorFullName?.trim() || params.authorUserName?.trim() || undefined;
    const firstSeenAt = new Date().toISOString();

    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        subscriberId,
        ...(firstName ? { firstName } : {}),
        data: {
          __novu_source: AGENT_PLATFORM_PROVISION_SOURCE,
          __novu_platform: params.platform,
          __novu_platformUserId: params.platformUserId,
          __novu_agentIdentifier: params.agentIdentifier,
          __novu_firstSeenAt: firstSeenAt,
        },
      })
    );

    const endpointType = this.endpointTypeFor(params.platform);

    try {
      await this.createChannelEndpoint.execute(
        CreateChannelEndpointCommand.create({
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          integrationIdentifier: params.integrationIdentifier,
          subscriberId,
          type: endpointType,
          endpoint: { userId: params.platformUserId },
        })
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      const winner = await this.channelEndpointRepository.findByPlatformIdentity({
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        integrationIdentifier: params.integrationIdentifier,
        type: endpointType,
        endpointField: 'userId',
        endpointValue: params.platformUserId,
      });

      if (!winner) {
        // Duplicate key fired but no winning row is visible. Likely a partial
        // index edge or transient read; surface the original error to the
        // caller rather than fabricate a subscriberId.
        throw err;
      }

      this.logger.warn(
        {
          orphanSubscriberId: subscriberId,
          winnerSubscriberId: winner.subscriberId,
          organizationId: params.organizationId,
          environmentId: params.environmentId,
          platform: params.platform,
          platformUserId: params.platformUserId,
        },
        'Lost ChannelEndpoint provision race; orphan Subscriber created without a platform identity binding.'
      );
      captureAgentWarning(err, {
        component: 'agent-subscriber-resolver',
        operation: 'provision-channel-endpoint-race-loss',
        platform: params.platform,
        agentIdentifier: params.agentIdentifier,
        extra: {
          organizationId: params.organizationId,
          environmentId: params.environmentId,
          orphanSubscriberId: subscriberId,
          winnerSubscriberId: winner.subscriberId,
        },
      });

      return winner.subscriberId;
    }

    this.analyticsService.track('[Agent Platform] - Subscriber auto-provisioned', 'system', {
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      platform: params.platform,
      agentIdentifier: params.agentIdentifier,
      productType: productType ?? null,
      subscriberId,
    });

    this.logger.debug(
      `Auto-provisioned subscriber ${subscriberId} for ${params.platform}:${params.platformUserId} in org ${params.organizationId}`
    );

    return subscriberId;
  }

  private endpointTypeFor(platform: AgentPlatformEnum): ChannelEndpointType {
    if (platform === AgentPlatformEnum.SLACK) return ENDPOINT_TYPES.SLACK_USER;
    if (platform === AgentPlatformEnum.TEAMS) return ENDPOINT_TYPES.MS_TEAMS_USER;

    throw new Error(`endpointTypeFor called with unsupported platform "${platform}"`);
  }
}

/**
 * MongoDB duplicate-key sentinel (E11000). Mirrors the helper in
 * `mcp-connection-vault.service.ts` — kept local to avoid an inter-service
 * import for a one-line predicate.
 */
function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 11000);
}
