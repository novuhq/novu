import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  PinoLogger,
} from '@novu/application-generic';
import { ChannelEndpointRepository, isDuplicateKeyError, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { AGENT_PLATFORM_PROVISION_SOURCE, AGENT_PROVISION_DATA_KEYS, ENDPOINT_TYPES } from '@novu/shared';
import { CreateChannelEndpointCommand } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import type { SubscriberResolution } from '../../shared/types/subscriber-resolution';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../../shared/util/email-normalization';
import { getPhoneLookupCandidates, toCanonicalE164Phone } from '../../shared/util/phone-normalization';
import { AUTO_PROVISION_PLATFORMS, PLATFORM_ENDPOINT_CONFIG } from '../../shared/util/platform-endpoint-config';
import { AgentSubscriberAdoptionService } from './agent-subscriber-adoption.service';

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
  /**
   * MS Teams only: the Azure AD tenant the inbound user belongs to. For multi-tenant distribution
   * this can be a customer tenant different from the bot's home tenant, and is persisted on the
   * endpoint so deliveries target the right tenant. Ignored for other platforms.
   */
  platformTenantId?: string | null;
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
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase,
    private readonly createChannelEndpoint: CreateChannelEndpoint,
    private readonly analyticsService: AnalyticsService,
    private readonly adoptionService: AgentSubscriberAdoptionService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Pure platform-identity lookup returning a discriminated outcome, so callers
   * can tell a genuine miss (`not_found`) apart from an unusable identity
   * (`invalid_identity`). Never returns the `error` outcome — lookup failures
   * propagate as rejections for the caller to classify. Safe for read-only
   * callers (reactions, actions, and platforms outside the auto-provision scope).
   */
  async resolveSubscriber(params: ResolveSubscriberParams): Promise<SubscriberResolution> {
    const { environmentId, organizationId, platform, platformUserId, integrationIdentifier } = params;

    if (!platformUserId.trim()) {
      return { outcome: 'invalid_identity' };
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

      return { outcome: 'not_found' };
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

      return { outcome: 'resolved', subscriberId: endpoint.subscriberId };
    }

    this.logger.debug(
      `No subscriber linked for platform user ${platform}:${platformUserId} (integration: ${integrationIdentifier})`
    );

    return { outcome: 'not_found' };
  }

  /**
   * Lookup-or-provision for inbound text messages on platforms where the agent
   * may create the subscriber itself: Slack/Teams (always) and email/WhatsApp
   * when the caller has established open access (`subscriberAccess === 'open'`).
   * Keyless exclusion is email-only and lives with the caller's config.
   *
   * Branches:
   *   - Author is a bot → throw `BotAuthorSkippedError` (runs before lookup so
   *     bot-authored messages cannot reach the bridge even when the bot's
   *     identity is already linked to a subscriber).
   *   - Hit on lookup → return existing subscriberId.
   *   - Miss → provision and return the new subscriberId. The subscriberId is
   *     deterministic from `(orgId, integrationIdentifier, platform,
   *     platformUserId)`, so any retry — race-loss, transient error,
   *     redelivery — lands on the same `Subscriber` row instead of
   *     accumulating phantoms. Slack/Teams also create the ChannelEndpoint
   *     binding; email/WhatsApp identity lives on `Subscriber.email` /
   *     `Subscriber.phone` alone.
   *
   * Slack/Teams throw on provisioning failure (dispatch stays off); the email
   * and WhatsApp open-access branches soft-fail to an `error` outcome so a
   * provisioning hiccup never crashes the inbound webhook. Throws for
   * non-provisionable platforms; callers MUST route reactions, actions, and
   * other inbound through `resolveSubscriber`.
   */
  async resolveOrProvision(params: ResolveOrProvisionParams): Promise<SubscriberResolution> {
    const isOpenAccessEmail = params.platform === AgentPlatformEnum.EMAIL;
    const isOpenAccessWhatsApp = params.platform === AgentPlatformEnum.WHATSAPP;

    if (!AUTO_PROVISION_PLATFORMS.has(params.platform) && !isOpenAccessEmail && !isOpenAccessWhatsApp) {
      throw new Error(
        `resolveOrProvision called for unsupported platform "${params.platform}". Route through resolveSubscriber instead.`
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

    if (isOpenAccessEmail) {
      return this.resolveOrProvisionEmail(params);
    }

    if (isOpenAccessWhatsApp) {
      return this.resolveOrProvisionWhatsApp(params);
    }

    const existing = await this.resolveSubscriber(params);
    if (existing.outcome === 'resolved') {
      return existing;
    }

    return { outcome: 'resolved', subscriberId: await this.provisionSubscriberAndEndpoint(params) };
  }

  /**
   * Email flavor of lookup-or-provision, used for open-access agents. Fully
   * soft-fail: a lookup or provisioning error is logged and mapped to an
   * `error` outcome so the inbound webhook keeps flowing — the turn then
   * continues unresolved and the managed subscriber gate replies instead.
   */
  private async resolveOrProvisionEmail(params: ResolveOrProvisionParams): Promise<SubscriberResolution> {
    try {
      const existing = await this.resolveSubscriber(params);
      if (existing.outcome !== 'not_found') {
        return existing;
      }

      const provisionedSubscriberId = await this.provisionEmailSubscriber({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        integrationIdentifier: params.integrationIdentifier,
        agentIdentifier: params.agentIdentifier,
        email: params.platformUserId,
      });

      // `provisionEmailSubscriber` only returns null for an unusable address,
      // which the lookup above would already have classified — kept for safety.
      return provisionedSubscriberId
        ? { outcome: 'resolved', subscriberId: provisionedSubscriberId }
        : { outcome: 'invalid_identity' };
    } catch (err) {
      this.logger.warn(
        err,
        `Open-access email subscriber resolution failed for agent ${params.agentIdentifier}, continuing without it`
      );
      captureAgentWarning(err, {
        component: 'agent-subscriber-resolver',
        operation: 'provision-open-access-email-subscriber',
        agentIdentifier: params.agentIdentifier,
        integrationIdentifier: params.integrationIdentifier,
      });

      return { outcome: 'error', err };
    }
  }

  /**
   * WhatsApp flavor of lookup-or-provision for open-access agents. Mirrors the
   * email soft-fail path: phone identity lives on `Subscriber.phone` only (no
   * ChannelEndpoint). Empty/unparseable phones map to `invalid_identity`.
   */
  private async resolveOrProvisionWhatsApp(params: ResolveOrProvisionParams): Promise<SubscriberResolution> {
    try {
      const existing = await this.resolveSubscriber(params);
      if (existing.outcome !== 'not_found') {
        return existing;
      }

      const provisionedSubscriberId = await this.provisionWhatsAppSubscriber({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        integrationIdentifier: params.integrationIdentifier,
        agentIdentifier: params.agentIdentifier,
        phone: params.platformUserId,
      });

      return provisionedSubscriberId
        ? { outcome: 'resolved', subscriberId: provisionedSubscriberId }
        : { outcome: 'invalid_identity' };
    } catch (err) {
      this.logger.warn(
        err,
        `Open-access WhatsApp subscriber resolution failed for agent ${params.agentIdentifier}, continuing without it`
      );
      captureAgentWarning(err, {
        component: 'agent-subscriber-resolver',
        operation: 'provision-open-access-whatsapp-subscriber',
        agentIdentifier: params.agentIdentifier,
        integrationIdentifier: params.integrationIdentifier,
      });

      return { outcome: 'error', err };
    }
  }

  /**
   * Lazily provision a Subscriber for a keyless email demo sender at the moment
   * an MCP connection is first needed. Email identity lives on `Subscriber.email`
   * (matched by `findByEmail` on subsequent turns) rather than a ChannelEndpoint,
   * so — unlike Slack/Teams — this creates only the Subscriber row, with the same
   * auto-provision provenance markers. Idempotent via the deterministic
   * subscriberId. Returns `null` when the address is unusable.
   */
  async provisionEmailSubscriber(params: {
    environmentId: string;
    organizationId: string;
    integrationIdentifier: string;
    agentIdentifier: string;
    email: string;
  }): Promise<string | null> {
    const email = normalizeEmailForLookup(params.email);

    if (!isValidEmailForLookup(email)) {
      this.logger.debug(`Skipping email subscriber provision for invalid address "${params.email}"`);

      return null;
    }

    const existing = await this.resolveAgentProvisionedEmailSubscriber({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      email,
    });

    if (existing) {
      return existing;
    }

    const subscriberId = buildPlatformSubscriberId({
      organizationId: params.organizationId,
      integrationIdentifier: params.integrationIdentifier,
      platform: AgentPlatformEnum.EMAIL,
      platformUserId: email,
    });

    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        subscriberId,
        email,
        data: {
          [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE,
          [AGENT_PROVISION_DATA_KEYS.platform]: AgentPlatformEnum.EMAIL,
          [AGENT_PROVISION_DATA_KEYS.platformUserId]: email,
          [AGENT_PROVISION_DATA_KEYS.agentIdentifier]: params.agentIdentifier,
          [AGENT_PROVISION_DATA_KEYS.firstSeenAt]: new Date().toISOString(),
        },
      })
    );

    this.analyticsService.track('[Agent Platform] - Subscriber auto-provisioned', params.organizationId, {
      _organization: params.organizationId,
      environmentId: params.environmentId,
      platform: AgentPlatformEnum.EMAIL,
      agentIdentifier: params.agentIdentifier,
      subscriberId,
    });

    this.logger.debug(
      `Lazily provisioned email subscriber ${subscriberId} for ${email} in org ${params.organizationId}`
    );

    return subscriberId;
  }

  /**
   * Provision a Subscriber for an open-access WhatsApp sender. Phone identity
   * lives on `Subscriber.phone` (canonical E.164 with `+`) — no ChannelEndpoint.
   * Idempotent via deterministic subscriberId. Returns `null` when the phone
   * is empty/unparseable.
   */
  private async provisionWhatsAppSubscriber(params: {
    environmentId: string;
    organizationId: string;
    integrationIdentifier: string;
    agentIdentifier: string;
    phone: string;
  }): Promise<string | null> {
    const phone = toCanonicalE164Phone(params.phone);

    if (!phone) {
      this.logger.debug(`Skipping WhatsApp subscriber provision for invalid phone "${params.phone}"`);

      return null;
    }

    const subscriberId = buildPlatformSubscriberId({
      organizationId: params.organizationId,
      integrationIdentifier: params.integrationIdentifier,
      platform: AgentPlatformEnum.WHATSAPP,
      platformUserId: phone,
    });

    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        subscriberId,
        phone,
        data: {
          [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE,
          [AGENT_PROVISION_DATA_KEYS.platform]: AgentPlatformEnum.WHATSAPP,
          [AGENT_PROVISION_DATA_KEYS.platformUserId]: phone,
          [AGENT_PROVISION_DATA_KEYS.agentIdentifier]: params.agentIdentifier,
          [AGENT_PROVISION_DATA_KEYS.firstSeenAt]: new Date().toISOString(),
        },
      })
    );

    this.analyticsService.track('[Agent Platform] - Subscriber auto-provisioned', params.organizationId, {
      _organization: params.organizationId,
      environmentId: params.environmentId,
      platform: AgentPlatformEnum.WHATSAPP,
      agentIdentifier: params.agentIdentifier,
      subscriberId,
    });

    this.logger.debug(
      `Lazily provisioned WhatsApp subscriber ${subscriberId} for ${phone} in org ${params.organizationId}`
    );

    return subscriberId;
  }

  private async resolveWhatsAppSubscriber(params: {
    environmentId: string;
    organizationId: string;
    platformUserId: string;
  }): Promise<SubscriberResolution> {
    const { environmentId, organizationId, platformUserId } = params;
    const phone = toCanonicalE164Phone(platformUserId);

    if (!phone) {
      this.logger.debug(`Skipping WhatsApp subscriber lookup for invalid phone "${platformUserId}"`);

      return { outcome: 'invalid_identity' };
    }

    const phoneCandidates = getPhoneLookupCandidates(platformUserId);
    const matches = await this.subscriberRepository.findByPhone(environmentId, organizationId, phoneCandidates);

    if (matches.length === 0) {
      this.logger.debug(`No subscriber found for WhatsApp phone ${platformUserId}`);

      return { outcome: 'not_found' };
    }

    // Partition matches into real (customer-created) vs auto-provisioned
    // "phantom" subscribers. A real subscriber always wins over a phantom so an
    // end user who signed up through the customer's app keeps their own identity
    // and history rather than fragmenting onto the phone-derived phantom.
    const phantoms = matches.filter(isAgentProvisionedSubscriber);
    const realSubscribers = matches.filter((m) => !isAgentProvisionedSubscriber(m));

    if (realSubscribers.length > 0) {
      const real = realSubscribers[0];

      if (realSubscribers.length > 1) {
        this.logger.warn(
          `Multiple customer-created subscribers (${realSubscribers.length}) share phone ${platformUserId} in environment ${environmentId} — using first match`
        );
      }

      if (phantoms.length > 0) {
        await this.adoptionService.adoptPhantomsInto({
          environmentId,
          organizationId,
          real: { _id: real._id, subscriberId: real.subscriberId },
          phantoms: phantoms.map((p) => ({ _id: p._id, subscriberId: p.subscriberId })),
        });
      }

      this.logger.debug(`Resolved WhatsApp phone ${platformUserId} → subscriber ${real.subscriberId}`);

      return { outcome: 'resolved', subscriberId: real.subscriberId };
    }

    if (phantoms.length > 1) {
      this.logger.warn(
        `Multiple auto-provisioned subscribers (${phantoms.length}) share phone ${platformUserId} in environment ${environmentId} — using first match`
      );
    }

    const phantom = phantoms[0];
    this.logger.debug(
      `Resolved WhatsApp phone ${platformUserId} → auto-provisioned subscriber ${phantom.subscriberId}`
    );

    return { outcome: 'resolved', subscriberId: phantom.subscriberId };
  }

  private async resolveAgentProvisionedEmailSubscriber(params: {
    environmentId: string;
    organizationId: string;
    email: string;
  }): Promise<string | null> {
    const { environmentId, organizationId, email } = params;

    const matches = await this.subscriberRepository.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        email: { $regex: new RegExp(`^${escapeRegExp(email)}$`, 'i') },
        [`data.${AGENT_PROVISION_DATA_KEYS.source}`]: AGENT_PLATFORM_PROVISION_SOURCE,
      },
      'subscriberId',
      { limit: 2 }
    );

    if (matches.length > 1) {
      this.logger.warn(
        `Multiple agent-provisioned subscribers (${matches.length}) share email ${email} in environment ${environmentId} — using first match`
      );
    }

    const subscriber = matches[0];

    if (subscriber) {
      this.logger.debug(`Resolved agent-provisioned email ${email} → subscriber ${subscriber.subscriberId}`);

      return subscriber.subscriberId;
    }

    this.logger.debug(`No agent-provisioned subscriber found for email ${email}`);

    return null;
  }

  private async resolveEmailSubscriber(params: {
    environmentId: string;
    organizationId: string;
    platformUserId: string;
  }): Promise<SubscriberResolution> {
    const { environmentId, organizationId, platformUserId } = params;
    const email = normalizeEmailForLookup(platformUserId);

    if (!isValidEmailForLookup(email)) {
      this.logger.debug(`Skipping email subscriber lookup for invalid address "${platformUserId}"`);

      return { outcome: 'invalid_identity' };
    }

    const matches = await this.subscriberRepository.findByEmail(environmentId, organizationId, email);

    if (matches.length === 0) {
      this.logger.debug(`No subscriber found for email ${email}`);

      return { outcome: 'not_found' };
    }

    // Partition matches into real (customer-created) vs auto-provisioned
    // "phantom" subscribers. A real subscriber always wins over a phantom so an
    // end user who signed up through the customer's app keeps their own identity
    // and history rather than fragmenting onto the address-derived phantom.
    const phantoms = matches.filter(isAgentProvisionedSubscriber);
    const realSubscribers = matches.filter((m) => !isAgentProvisionedSubscriber(m));

    if (realSubscribers.length > 0) {
      const real = realSubscribers[0];

      if (realSubscribers.length > 1) {
        this.logger.warn(
          `Multiple customer-created subscribers (${realSubscribers.length}) share email ${email} in environment ${environmentId} — using first match`
        );
      }

      // Lazy adoption: fold any phantom(s) that share this address into the real
      // subscriber so their conversations and tool grants follow the surviving
      // identity. Best-effort and idempotent — never throws, so a merge hiccup
      // can't block the inbound turn (it retries on the next email).
      if (phantoms.length > 0) {
        await this.adoptionService.adoptPhantomsInto({
          environmentId,
          organizationId,
          real: { _id: real._id, subscriberId: real.subscriberId },
          phantoms: phantoms.map((p) => ({ _id: p._id, subscriberId: p.subscriberId })),
        });
      }

      this.logger.debug(`Resolved email ${email} → subscriber ${real.subscriberId}`);

      return { outcome: 'resolved', subscriberId: real.subscriberId };
    }

    // Only phantom(s) exist — no customer-created subscriber yet. Resolve to the
    // phantom so the open-access agent keeps replying under the same identity.
    if (phantoms.length > 1) {
      this.logger.warn(
        `Multiple auto-provisioned subscribers (${phantoms.length}) share email ${email} in environment ${environmentId} — using first match`
      );
    }

    const phantom = phantoms[0];
    this.logger.debug(`Resolved email ${email} → auto-provisioned subscriber ${phantom.subscriberId}`);

    return { outcome: 'resolved', subscriberId: phantom.subscriberId };
  }

  private async provisionSubscriberAndEndpoint(params: ResolveOrProvisionParams): Promise<string> {
    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[params.platform];
    if (!endpointConfig) {
      throw new Error(`No endpoint config for auto-provision platform "${params.platform}"`);
    }

    /**
     * Deterministic subscriberId derived from the platform identity tuple
     * keeps `createOrUpdateSubscriber` idempotent across retries — any
     * race-loser, transient error, or redelivered webhook lands on the
     * same `Subscriber` row instead of leaving orphan rows. The Subscriber
     * upsert runs first; the ChannelEndpoint write is gated by the partial
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

    /*
     * Only MS Teams endpoints carry a tenantId (the user's Azure AD tenant). Adding it to other
     * platform endpoints (e.g. Slack) would fail their strict endpoint validators, so it is gated
     * on the Teams endpoint type and the tenant being present.
     */
    const endpoint =
      endpointConfig.endpointType === ENDPOINT_TYPES.MS_TEAMS_USER && params.platformTenantId
        ? { userId: params.platformUserId, tenantId: params.platformTenantId }
        : { userId: params.platformUserId };

    try {
      await this.createChannelEndpoint.execute(
        CreateChannelEndpointCommand.create({
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          integrationIdentifier: params.integrationIdentifier,
          subscriberId,
          type: endpointConfig.endpointType,
          endpoint,
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
      subscriberId,
    });

    this.logger.debug(
      `Auto-provisioned subscriber ${subscriberId} for ${params.platform}:${params.platformUserId} in org ${params.organizationId}`
    );

    return subscriberId;
  }

  /**
   * Drops the Subscriber upserted above when ChannelEndpoint creation fails for
   * a reason other than E11000, so we are not left with a provisioned
   * Subscriber row that has no platform link.
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
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when a subscriber was auto-created from an inbound platform message
 * (identified by the `__novu_source` provenance marker on `Subscriber.data`)
 * rather than by the customer's API/dashboard. Used to prefer real subscribers
 * over phantoms and to target phantoms for adoption.
 */
function isAgentProvisionedSubscriber(subscriber: Pick<SubscriberEntity, 'data'>): boolean {
  return subscriber.data?.[AGENT_PROVISION_DATA_KEYS.source] === AGENT_PLATFORM_PROVISION_SOURCE;
}

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
