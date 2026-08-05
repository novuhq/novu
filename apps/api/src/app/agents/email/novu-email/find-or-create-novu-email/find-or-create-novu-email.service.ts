import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  encryptSecret,
  generateAgentInboxRoutingKey,
  isAgentEmailEnabled,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
} from '@novu/application-generic';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  CommunityOrganizationRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  EmailProviderIdEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  NOVU_PROVIDERS,
  providers,
  slugify,
} from '@novu/shared';
import { ClientSession } from 'mongoose';
import shortid from 'shortid';

import type { AgentIntegrationResponseDto } from '../../../shared/dtos';
import { toAgentIntegrationResponse } from '../../../shared/mappers/agent-response.mapper';

/**
 * Max collision-retry attempts when minting the per-agent inbox routing key.
 * 8 chars from a 36-char alphabet gives ~2.8 × 10¹² combinations, so a duplicate
 * key is astronomically rare — the loop is here as a safety net rather than a
 * realistic hot path.
 */
const ROUTING_KEY_MAX_ATTEMPTS = 5;

/** Mongo duplicate-key error code. */
const MONGO_DUPLICATE_KEY = 11000;

export type FindOrCreateNovuEmailResult = {
  response: AgentIntegrationResponseDto;
  provisionedNewLink: boolean;
};

function sanitizeSlug(input: string): string {
  return slugify(input).slice(0, 32).replace(/^-+/, '').replace(/-+$/, '');
}

@Injectable()
export class NovuEmailProvisioningService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  /**
   * Find the agent's existing NovuAgent integration link, or create a new
   * Integration + link atomically. Idempotent — safe to call concurrently.
   */
  async execute(agentId: string, environmentId: string, organizationId: string): Promise<FindOrCreateNovuEmailResult> {
    await this.enforceEmailTier(organizationId);

    const agent = await this.agentRepository.findOne(
      { _id: agentId, _environmentId: environmentId, _organizationId: organizationId },
      ['_id', 'identifier', 'name']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${agentId}" was not found.`);
    }

    const existing = await this.findExistingLink(agent, environmentId, organizationId);
    if (existing) return { response: existing, provisionedNewLink: false };

    const emailSlugPrefix = this.deriveEmailSlugPrefix(agent);
    const defaultOutboundIntegrationId = await this.resolveDefaultOutboundIntegrationId(environmentId, organizationId);

    return this.agentIntegrationRepository.withTransaction(async (session) => {
      const recheck = await this.findExistingLink(agent, environmentId, organizationId);
      if (recheck) return { response: recheck, provisionedNewLink: false };

      const displayName = providers.find((p) => p.id === EmailProviderIdEnum.NovuAgent)?.displayName ?? 'Novu Email';
      const identifier = `${slugify(displayName)}-${shortid.generate()}`;

      const integration = await this.createNovuAgentIntegration({
        displayName,
        identifier,
        emailSlugPrefix,
        senderName: agent.name,
        outboundIntegrationId: defaultOutboundIntegrationId,
        environmentId,
        organizationId,
        session,
      });

      const response = await this.createLink(agent, integration, environmentId, organizationId, session);

      return { response, provisionedNewLink: true };
    });
  }

  /**
   * Mints the NovuAgent integration.
   *
   * On shared-inbox deployments (cloud) a freshly-generated `inboxRoutingKey` is
   * attached. The key is globally unique under a partial index gated to
   * NovuAgent rows (`{ 'credentials.inboxRoutingKey': 1 }`), so the lone failure
   * mode of a duplicate-key collision is retried up to
   * {@link ROUTING_KEY_MAX_ATTEMPTS} times before surfacing the error.
   *
   * On non-shared-inbox deployments (self-hosted) there is no shared domain to
   * route against, so we skip routing-key minting entirely and persist
   * `sharedInboxDisabled: true`. Inbound is wired through a per-tenant verified
   * Domain + DomainRoute(type=AGENT) instead. The outbound sender is optional
   * here and assigned later via the agent email setup guide.
   */
  private async createNovuAgentIntegration({
    displayName,
    identifier,
    emailSlugPrefix,
    senderName,
    outboundIntegrationId,
    environmentId,
    organizationId,
    session,
  }: {
    displayName: string;
    identifier: string;
    emailSlugPrefix: string;
    senderName: string;
    outboundIntegrationId?: string;
    environmentId: string;
    organizationId: string;
    session: ClientSession | null;
  }): Promise<IntegrationEntity> {
    const baseCredentials = {
      secretKey: encryptSecret(randomBytes(32).toString('hex')),
      emailSlugPrefix,
      senderName,
      ...(outboundIntegrationId ? { outboundIntegrationId } : {}),
    };

    // The create envelope is identical across both branches; only `credentials`
    // varies (shared-inbox routing key vs. self-hosted disabled flag). Build it
    // once so the lone `as any` (a pre-existing DAL signature wart) lives in a
    // single place. The cast is needed because the repository's `create` accepts
    // a query type rather than a plain document.
    const buildPayload = (credentials: Record<string, unknown>) =>
      ({
        providerId: EmailProviderIdEnum.NovuAgent,
        channel: ChannelTypeEnum.EMAIL,
        credentials,
        configurations: {},
        name: displayName,
        identifier,
        active: true,
        _environmentId: environmentId,
        _organizationId: organizationId,
      }) as any;

    // Self-hosted: no shared domain to route against, so skip routing-key minting
    // (and its collision loop) and persist the disabled flag. Inbound is wired
    // through a per-tenant verified Domain + DomainRoute(type=AGENT).
    if (!isAgentSharedInboxEnabled()) {
      return this.integrationRepository.create(buildPayload({ ...baseCredentials, sharedInboxDisabled: true }), {
        session,
      });
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < ROUTING_KEY_MAX_ATTEMPTS; attempt += 1) {
      const inboxRoutingKey = generateAgentInboxRoutingKey();
      try {
        return await this.integrationRepository.create(buildPayload({ ...baseCredentials, inboxRoutingKey }), {
          session,
        });
      } catch (err) {
        if (!isInboxRoutingKeyCollision(err)) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError ?? new Error('Failed to mint a unique inboxRoutingKey after retries');
  }

  /**
   * Resolve the integration id we persist as the agent's default outbound
   * sender. Preference order:
   *
   *   1. The env's active primary email integration that isn't Novu-owned
   *      (i.e. an integration the user explicitly wired up for production
   *      sending — SendGrid, Resend, …). Identified by `primary: true` on the
   *      email channel, excluding `NOVU_PROVIDERS` so we never accidentally
   *      pick the inbound-only NovuAgent row or the demo provider here.
   *   2. The env's bundled Novu Email demo integration row, auto-seeded for
   *      Development environments alongside the org. It's quota-limited but
   *      lets the agent reply out of the box without any user configuration.
   *
   * On shared-inbox deployments (cloud) we deliberately throw when neither
   * exists rather than persisting an empty sentinel: every downstream path
   * (send-agent-test-email + chat-sdk's `buildSendEmailCallback`) assumes a
   * concrete integration id, and a misconfigured env (custom non-prod env with
   * no email seeded) is surfaced loudly so the user can fix it instead of
   * silently routing through a synthetic demo that may also be unavailable.
   *
   * On self-hosted there is no bundled Novu demo provider, so a fresh org has
   * no outbound sender to attach yet. We return `undefined` and let the agent
   * email setup guide assign a provider; sending stays gracefully blocked with
   * a clear error until one is selected.
   */
  private async resolveDefaultOutboundIntegrationId(
    environmentId: string,
    organizationId: string
  ): Promise<string | undefined> {
    const primaryCustom = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      providerId: { $nin: NOVU_PROVIDERS } as unknown as string,
    });
    if (primaryCustom) return primaryCustom._id;

    const novuDemo = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      channel: ChannelTypeEnum.EMAIL,
      providerId: EmailProviderIdEnum.Novu,
      active: true,
    });
    if (novuDemo) return novuDemo._id;

    if (isAgentSharedInboxEnabled()) {
      throw new ConflictException(
        'No outbound email integration available for this environment. Activate the Novu Email demo provider or configure a primary email integration.'
      );
    }

    return undefined;
  }

  /**
   * Build the per-agent slug prefix from the agent's identifier. Falls back
   * to a random short id if the identifier slugifies to something the slug
   * regex would reject (empty, longer than 32 chars after sanitization, etc.).
   */
  private deriveEmailSlugPrefix(agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>): string {
    const candidate = sanitizeSlug(agent.identifier ?? agent.name ?? '');
    if (candidate && isValidAgentEmailSlugPrefix(candidate)) {
      return candidate;
    }

    // Fallback: shortid + sanitize. shortid uses URL-safe chars that include
    // `_` and `~` which our slug regex rejects, so we sanitize the result and
    // retry a small number of times before falling back to a deterministic
    // last-resort slug derived from the agent id (always passes the regex).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fallback = sanitizeSlug(`agent-${shortid.generate().toLowerCase()}`);
      if (fallback && isValidAgentEmailSlugPrefix(fallback)) {
        return fallback;
      }
    }

    return `agent-${agent._id.slice(-8)}`;
  }

  private async findExistingLink(
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>,
    environmentId: string,
    organizationId: string
  ): Promise<AgentIntegrationResponseDto | null> {
    const agentId = agent._id;
    const links = await this.agentIntegrationRepository.find(
      { _agentId: agentId, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );

    if (links.length === 0) return null;

    const linkedIntegrationIds = links.map((l) => l._integrationId);
    // Include `credentials` so the mapper can derive the shared-inbox address
    // from `emailSlugPrefix`. The field is plaintext (no decryption needed).
    const emailIntegration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (!emailIntegration) return null;

    const link = links.find((l) => l._integrationId === emailIntegration._id);
    if (!link) return null;

    return toAgentIntegrationResponse(link, emailIntegration, agent);
  }

  private async createLink(
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'> &
      Partial<Pick<IntegrationEntity, 'credentials'>>,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<AgentIntegrationResponseDto> {
    const agentId = agent._id;
    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agentId,
        _integrationId: integration._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id'],
      { session }
    );

    if (existingLink) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    // Revives a tombstoned (disconnected) link when one exists for this pair —
    // a plain create would violate the unique (_agentId, _integrationId) index.
    const link = await this.agentIntegrationRepository.createOrReviveLink({
      agentId,
      integrationId: integration._id,
      environmentId,
      organizationId,
      session,
    });

    return toAgentIntegrationResponse(link, integration, agent);
  }

  private async enforceEmailTier(organizationId: string): Promise<void> {
    if (!isAgentEmailEnabled()) {
      throw new ForbiddenException('Agent Novu Email is not available in this deployment.');
    }

    const organization = await this.organizationRepository.findById(organizationId);
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
    const allowed = getFeatureForTierAsBoolean(FeatureNameEnum.AGENT_EMAIL_INTEGRATION, tier);

    if (!allowed) {
      throw new HttpException('Payment Required', HttpStatus.PAYMENT_REQUIRED);
    }
  }
}

/**
 * Detects a duplicate-key violation on the partial unique index for
 * `credentials.inboxRoutingKey`. We narrow on the index name rather than the
 * raw error code so an unrelated future unique index doesn't get retried by
 * accident.
 */
function isInboxRoutingKeyCollision(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: number; codeName?: string; message?: string };
  if (candidate.code !== MONGO_DUPLICATE_KEY) return false;
  const message = typeof candidate.message === 'string' ? candidate.message : '';

  return message.includes('credentials.inboxRoutingKey');
}
