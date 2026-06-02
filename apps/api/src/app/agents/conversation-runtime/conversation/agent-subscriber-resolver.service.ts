import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  FeatureFlagsService,
  PinoLogger,
} from '@novu/application-generic';
import {
  ChannelEndpointRepository,
  CommunityOrganizationRepository,
  isDuplicateKeyError,
  SubscriberRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum, OrganizationProductTypeEnum } from '@novu/shared';
import { CreateChannelEndpointCommand } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../../shared/util/email-normalization';
import { getPhoneLookupCandidates } from '../../shared/util/phone-normalization';
import { AUTO_PROVISION_PLATFORMS, PLATFORM_ENDPOINT_CONFIG } from '../../shared/util/platform-endpoint-config';

/**
 * Provenance keys stamped on every auto-provisioned `Subscriber.data` blob.
 * Centralised so the resolver, the cap query, the sparse index in
 * `subscriber.schema.ts`, and tests stay in lockstep — a typo anywhere else
 * would silently de-link the cap counter from the rows it's supposed to
 * count. Flat scalar keys because `SubscriberCustomData` is a
 * `Record<string, scalar>`.
 */
export const AGENT_PROVISION_DATA_KEYS = {
  source: '__novu_source',
  platform: '__novu_platform',
  platformUserId: '__novu_platformUserId',
  agentIdentifier: '__novu_agentIdentifier',
  firstSeenAt: '__novu_firstSeenAt',
} as const;

/**
 * Sentinel value written to `Subscriber.data[AGENT_PROVISION_DATA_KEYS.source]`
 * for every subscriber the resolver auto-creates from an inbound platform
 * message. The cap counter (and the sparse index that backs it) uses this
 * marker — never mutate without coordinating the index and the cap query.
 */
export const AGENT_PLATFORM_PROVISION_SOURCE = 'agent-platform-provision' as const;

/** Default cap applied to Connect orgs when LaunchDarkly does not override. */
export const DEFAULT_CONNECT_ORG_AUTO_PROVISIONED_SUBSCRIBERS_LIMIT = 25;

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
   *   - Author is a bot → throw `BotAuthorSkippedError` (runs before lookup so
   *     bot-authored messages cannot reach the bridge even when the bot's
   *     identity is already linked to a subscriber).
   *   - Hit on lookup → return existing subscriberId.
   *   - Miss + Connect org at cap → throw `ConnectOrgSubscriberCapExceededError`.
   *   - Miss otherwise → upsert Subscriber + ChannelEndpoint and return the
   *     new subscriberId. The subscriberId is deterministic from
   *     `(orgId, integrationIdentifier, platform, platformUserId)`, so any
   *     retry — race-loss, transient error, redelivery — lands on the same
   *     `Subscriber` row instead of accumulating phantoms toward the cap.
   *
   * Throws for non-provisionable platforms; callers MUST route reactions,
   * actions, and non-Slack/Teams inbound through `resolveOnly`.
   *
   * Known limitation — bounded cap-overshoot under concurrency:
   *   `assertCapNotReached` is a read-before-write check that is intentionally
   *   not wrapped in a transaction. Two concurrent first-messages from
   *   *different* users can both observe `count < limit` and both succeed,
   *   so an org may end up at `limit + 1` (or `limit + N` for N concurrent
   *   distinct users). The overshoot is bounded to one extra subscriber per
   *   racing inbound — not unbounded leakage — and counters re-converge on
   *   the next inbound that finds the org at `count >= limit`. Tightening
   *   this further would require a Mongo transaction or distributed lock
   *   around the cap query + the two writes, which is overkill for the
   *   blast-radius and would also serialize a hot path. If the overshoot
   *   becomes load-bearing, the right move is a per-org Redis lease around
   *   `assertCapNotReached + provision`, not a server-side transaction.
   */
  async resolveOrProvision(params: ResolveOrProvisionParams): Promise<string> {
    if (!AUTO_PROVISION_PLATFORMS.has(params.platform)) {
      throw new Error(
        `resolveOrProvision called for unsupported platform "${params.platform}". Route through resolveOnly instead.`
      );
    }

    if (params.authorIsBot) {
      this.analyticsService.track('[Agent Platform] - Bot author inbound skipped', params.organizationId, {
        _organization: params.organizationId,
        environmentId: params.environmentId,
        platform: params.platform,
        agentIdentifier: params.agentIdentifier,
      });
      throw new BotAuthorSkippedError(params.platform, params.platformUserId);
    }

    const existing = await this.resolveOnly(params);
    if (existing) {
      return existing;
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

    return organization?.productType;
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
        [`data.${AGENT_PROVISION_DATA_KEYS.source}`]: AGENT_PLATFORM_PROVISION_SOURCE,
      },
      limit + 1
    );

    if (count >= limit) {
      this.analyticsService.track('[Agent Platform] - Connect org subscriber cap reached', params.organizationId, {
        _organization: params.organizationId,
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
    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[params.platform];
    if (!endpointConfig) {
      throw new Error(`No endpoint config for auto-provision platform "${params.platform}"`);
    }

    /**
     * Deterministic subscriberId derived from the platform identity tuple
     * keeps `createOrUpdateSubscriber` idempotent across retries — any
     * race-loser, transient error, or redelivered webhook lands on the
     * same `Subscriber` row instead of leaving orphan rows that the
     * Connect-org cap query would happily count. The Subscriber upsert
     * runs first; the ChannelEndpoint write is gated by the partial
     * unique index, and on E11000 we read back the winner row (whose
     * `subscriberId` is necessarily the same deterministic value).
     */
    const subscriberId = buildPlatformSubscriberId({
      organizationId: params.organizationId,
      integrationIdentifier: params.integrationIdentifier,
      platform: params.platform,
      platformUserId: params.platformUserId,
    });
    const firstName = params.authorFullName?.trim() || params.authorUserName?.trim() || undefined;
    const firstSeenAt = new Date().toISOString();

    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        subscriberId,
        ...(firstName ? { firstName } : {}),
        data: {
          [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE,
          [AGENT_PROVISION_DATA_KEYS.platform]: params.platform,
          [AGENT_PROVISION_DATA_KEYS.platformUserId]: params.platformUserId,
          [AGENT_PROVISION_DATA_KEYS.agentIdentifier]: params.agentIdentifier,
          [AGENT_PROVISION_DATA_KEYS.firstSeenAt]: firstSeenAt,
        },
      })
    );

    try {
      await this.createChannelEndpoint.execute(
        CreateChannelEndpointCommand.create({
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          integrationIdentifier: params.integrationIdentifier,
          subscriberId,
          type: endpointConfig.endpointType,
          endpoint: { userId: params.platformUserId },
        })
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        await this.rollbackAutoProvisionedSubscriber(params.environmentId, subscriberId, err);

        throw err;
      }

      const winner = await this.channelEndpointRepository.findByPlatformIdentity({
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        integrationIdentifier: params.integrationIdentifier,
        type: endpointConfig.endpointType,
        endpointField: endpointConfig.identityField,
        endpointValue: params.platformUserId,
      });

      if (!winner) {
        // Duplicate key fired but no winning row visible — pathological
        // partial-index edge or transient read; surface the original error.
        throw err;
      }

      this.logger.debug(
        `Auto-provision race loser converged on existing ChannelEndpoint for ${params.platform}:${params.platformUserId} (subscriberId=${winner.subscriberId})`
      );

      return winner.subscriberId;
    }

    this.analyticsService.track('[Agent Platform] - Subscriber auto-provisioned', params.organizationId, {
      _organization: params.organizationId,
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

  /**
   * Drops the Subscriber upserted above when ChannelEndpoint creation fails for
   * a reason other than E11000, so the Connect-org cap counter is not left
   * counting a row with no platform link.
   */
  private async rollbackAutoProvisionedSubscriber(
    environmentId: string,
    subscriberId: string,
    cause: unknown
  ): Promise<void> {
    try {
      await this.subscriberRepository.delete({
        _environmentId: environmentId,
        subscriberId,
        [`data.${AGENT_PROVISION_DATA_KEYS.source}`]: AGENT_PLATFORM_PROVISION_SOURCE,
      });
    } catch (deleteErr) {
      this.logger.warn(
        deleteErr,
        `Failed to roll back auto-provisioned subscriber ${subscriberId} after ChannelEndpoint error`
      );

      return;
    }

    this.logger.debug(
      `Rolled back auto-provisioned subscriber ${subscriberId} after ChannelEndpoint failure: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
}

/**
 * 12 base64url characters from a SHA-256 of the platform-identity tuple. ≈ 72
 * bits of entropy — collision-safe within an environment against
 * customer-created subscriberIds, and short enough to remain readable in
 * logs and dashboard URLs. Deterministic so retries against the same tuple
 * resolve to the same `Subscriber` row.
 */
function buildPlatformSubscriberId(params: {
  organizationId: string;
  integrationIdentifier: string;
  platform: AgentPlatformEnum;
  platformUserId: string;
}): string {
  const fingerprint = createHash('sha256')
    .update(`${params.organizationId}:${params.integrationIdentifier}:${params.platform}:${params.platformUserId}`)
    .digest('base64url');

  return `sub_${fingerprint.slice(0, 12)}`;
}
