import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptChannelConnectionAuth, decryptCredentials, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationEntity,
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  CommunityOrganizationRepository,
  ICredentialsEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { AgentSubscriberAccessEnum, EmailProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import type { WellKnownEmoji } from 'chat';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { AgentInactiveException } from '../shared/errors/agent-inactive.exception';
import { AgentIntegrationDisconnectedException } from '../shared/errors/agent-integration-disconnected.exception';
import { esmImport } from '../shared/util/esm-import';
import { isAutoProvisionPlatform } from '../shared/util/platform-endpoint-config';
import { resolveAgentPlatform } from '../shared/util/provider-to-platform';

let cachedEmojiNames: Set<string> | null = null;

async function loadEmojiNames(): Promise<Set<string>> {
  if (cachedEmojiNames) return cachedEmojiNames;

  const { DEFAULT_EMOJI_MAP } = await esmImport('chat');
  cachedEmojiNames = new Set<string>(Object.keys(DEFAULT_EMOJI_MAP));

  return cachedEmojiNames;
}

/**
 * Where the call into `AgentConfigResolver.resolve` is coming from.
 *
 * - `'webhook_verification'` — platform is performing a verification
 *   handshake (e.g. WhatsApp/Meta GET challenge). No real event yet.
 * - `'webhook_message'` — platform is delivering a real inbound webhook
 *   message. Used to mark the agent–integration link as connected.
 *
 * Outbound flows (replies, DMs, reactions) call `resolve` without a source.
 */
export type AgentConfigResolveSource = 'webhook_verification' | 'webhook_message';

export interface ResolvedAgentConfig {
  platform: AgentPlatformEnum;
  credentials: ICredentialsEntity;
  connectionAccessToken?: string;
  environmentId: string;
  organizationId: string;
  isKeyless: boolean;
  isManaged: boolean;
  agentId: string;
  agentIdentifier: string;
  /** Human-readable display name; used in email-action confirmation UI. */
  agentName: string;
  integrationIdentifier: string;
  integrationId: string;
  /**
   * Provider id of the resolved integration (e.g. `slack`, `msteams`). Identifies
   * the channel type for active-channel plan-limit enforcement, where multiple
   * integrations of the same provider count as a single channel.
   */
  providerId: string;
  /**
   * Whether the organization removed Novu branding (Pro and above). Drives the
   * "Powered by Novu" watermark applied by the outbound gateway on every
   * delivery path.
   */
  removeNovuBranding: boolean;
  acknowledgeOnReceived: boolean;
  reactionOnResolved: WellKnownEmoji | null;
  /**
   * Whether unknown senders are auto-provisioned as subscribers (`open`) or
   * gated (`restricted`). Resolved to an effective value per platform: an
   * explicit `agent.behavior.subscriberAccess` always wins; when unset,
   * auto-provision platforms (Slack/Teams) default to `open` (preserving their
   * historical always-provision behavior) and every other platform defaults to
   * `restricted`. Consumed by the inbound handler across all provision-capable
   * platforms.
   */
  subscriberAccess: AgentSubscriberAccessEnum;
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
}

const DEFAULT_REACTION_ON_RESOLVED: WellKnownEmoji = 'check';

/**
 * Resolves the effective subscriber-access policy for a platform. An explicit
 * agent setting always wins. When unset, auto-provision platforms (Slack/Teams)
 * default to `open` so they keep their historical always-provision behavior,
 * while every other platform defaults to `restricted`.
 */
function resolveEffectiveSubscriberAccess(
  explicit: AgentSubscriberAccessEnum | undefined,
  platform: AgentPlatformEnum
): AgentSubscriberAccessEnum {
  if (typeof explicit === 'undefined') {
    return isAutoProvisionPlatform(platform) ? AgentSubscriberAccessEnum.OPEN : AgentSubscriberAccessEnum.RESTRICTED;
  }

  return explicit;
}

/**
 * Extract log-safe fields from an error thrown by an axios request. Raw axios errors carry the full
 * request `config` — including the `Authorization: Bearer <token>` header — plus `request`/`response`
 * objects, so they must never be logged directly. Returns only the HTTP status, the Slack error code
 * (when present) and a short message string.
 */
function toLogSafeError(err: unknown): { status?: number; slackError?: string; message: string } {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;

    return { status: err.response?.status, slackError: data?.error, message: err.message };
  }

  return { message: err instanceof Error ? err.message : String(err) };
}

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 11000);
}

async function resolveReaction(
  value: string | null | undefined,
  defaultEmoji: WellKnownEmoji,
  log: PinoLogger
): Promise<WellKnownEmoji | null> {
  if (value === null) return null;
  if (value === undefined) return defaultEmoji;

  const known = await loadEmojiNames();
  if (!known.has(value)) {
    log.warn(`Unknown emoji "${value}" in agent config, falling back to default "${defaultEmoji}"`);

    return defaultEmoji;
  }

  return value as WellKnownEmoji;
}

@Injectable()
export class AgentConfigResolver {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async resolve(
    agentId: string,
    integrationIdentifier: string,
    options: { source?: AgentConfigResolveSource } = {}
  ): Promise<ResolvedAgentConfig> {
    const agent = await this.agentRepository.findByIdForWebhook(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    if (agent.active === false) {
      throw new AgentInactiveException(agentId);
    }

    const { _environmentId: environmentId, _organizationId: organizationId } = agent;

    const integration = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      identifier: integrationIdentifier,
    });
    if (!integration) {
      throw new NotFoundException(`Integration ${integrationIdentifier} not found for agent ${agentId}`);
    }

    // The NovuAgent integration's `active` flag is the per-agent email kill switch
    // ("Enable email inbox" toggle in the dashboard). When false the email channel
    // for this agent is disabled - reject resolve here so both inbound webhook and
    // outbound chat paths fail fast with a clear error.
    if (integration.providerId === EmailProviderIdEnum.NovuAgent && integration.active === false) {
      throw new UnprocessableEntityException(`Email channel is disabled for agent ${agentId}`);
    }

    let agentIntegration = await this.agentIntegrationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        _integrationId: integration._id,
      },
      '*'
    );
    if (!agentIntegration) {
      // A tombstoned link means the user deliberately disconnected this channel.
      // Reject instead of consulting the heal, so a still-registered platform
      // webhook cannot resurrect the link. The explicit `disconnectedAt`
      // condition bypasses the schema-level tombstone exclusion.
      const disconnectedLink = await this.agentIntegrationRepository.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          _agentId: agentId,
          _integrationId: integration._id,
          disconnectedAt: { $ne: null },
        },
        ['_id']
      );

      if (disconnectedLink) {
        this.logger.info(
          { agentId, integrationIdentifier },
          'Rejecting resolve for an integration that was deliberately disconnected from the agent'
        );
        throw new AgentIntegrationDisconnectedException(agentId, integrationIdentifier);
      }

      agentIntegration = await this.tryHealMissingAgentIntegrationLink({
        agentId,
        agentIdentifier: agent.identifier,
        integration,
        integrationIdentifier,
        environmentId,
        organizationId,
        source: options.source,
      });

      if (!agentIntegration) {
        throw new UnprocessableEntityException(
          `Agent ${agentId} is not linked to integration ${integrationIdentifier}`
        );
      }
    }

    const platform = resolveAgentPlatform(integration.providerId);
    if (!platform) {
      throw new UnprocessableEntityException(
        `Provider ${integration.providerId} is not supported as an agent platform`
      );
    }

    const credentials = decryptCredentials(integration.credentials);

    // Defense in depth: reject Telegram inbound webhooks that have not completed
    // the Configure step. ConfigureTelegramAgentWebhook is the only place that
    // provisions credentials.token (the X-Telegram-Bot-Api-Secret-Token). Without
    // it the @chat-adapter/telegram handleWebhook is fail-open and would accept
    // every POST regardless of origin. Throwing NotFoundException here makes this
    // public endpoint indistinguishable from "unknown agent / unknown integration"
    // so callers cannot fingerprint which integrations are mid-setup.
    if (platform === AgentPlatformEnum.TELEGRAM && !credentials.token) {
      this.logger.warn(
        { agentId, integrationIdentifier },
        'Telegram inbound webhook rejected: secret_token not yet configured for this integration'
      );
      throw new NotFoundException();
    }

    // Same defense-in-depth as Telegram: ConfigureSendblueWebhook is the only place that
    // provisions credentials.token (the sb-signing-secret shared secret). Without it the
    // adapter has no secret to verify inbound webhooks against, so reject early and keep the
    // public endpoint indistinguishable from "unknown agent / unknown integration".
    if (platform === AgentPlatformEnum.SENDBLUE && !credentials.token) {
      this.logger.warn(
        { agentId, integrationIdentifier },
        'Sendblue inbound webhook rejected: webhook secret not yet configured for this integration'
      );
      throw new NotFoundException();
    }

    let connectionAccessToken: string | undefined;
    if (platform === AgentPlatformEnum.SLACK) {
      connectionAccessToken = await this.resolveSlackBotToken(environmentId, organizationId, integrationIdentifier);

      if (options.source === 'webhook_message') {
        if (!credentials.signingSecret) {
          throw new UnprocessableEntityException(
            'Slack signing secret is missing. Complete Slack app setup (quick setup or paste credentials) for this integration.'
          );
        }

        if (!connectionAccessToken) {
          throw new UnprocessableEntityException(
            'Slack workspace is not installed. Open the agent Slack setup guide and click Install to connect your workspace via OAuth.'
          );
        }
      }
    } else {
      const connection = await this.channelConnectionRepository.findOne({
        _environmentId: environmentId,
        _organizationId: organizationId,
        integrationIdentifier,
      });
      if (connection) {
        const decryptedAuth = decryptChannelConnectionAuth(connection.auth);
        connectionAccessToken = decryptedAuth?.accessToken;
      }
    }

    // NOTE: `connectedAt` is intentionally NOT written here. Marking the link
    // connected on any inbound webhook POST is too eager: every webhook event
    // hits `resolve` first, including the agent's own outbound messages that the
    // platform echoes back (e.g. the post-install welcome DM Slack delivers as a
    // `message.im` event). That echo would mark the integration connected — and
    // complete onboarding — before the user ever sends a message. Connection is
    // now recorded only when a genuine, non-bot user message is dispatched, in
    // `AgentInboundHandler.handle` (after the bot-author filter).

    return {
      platform,
      credentials,
      connectionAccessToken,
      environmentId,
      organizationId,
      isKeyless: isKeylessOrganization(organizationId),
      isManaged: agent.runtime === 'managed' && !!agent.managedRuntime,
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      agentName: agent.name,
      integrationIdentifier,
      integrationId: integration._id,
      providerId: integration.providerId,
      removeNovuBranding: await this.resolveRemoveNovuBranding(organizationId),
      acknowledgeOnReceived: agent.behavior?.acknowledgeOnReceived !== false,
      reactionOnResolved: await resolveReaction(
        agent.behavior?.reactionOnResolved,
        DEFAULT_REACTION_ON_RESOLVED,
        this.logger
      ),
      subscriberAccess: resolveEffectiveSubscriberAccess(agent.behavior?.subscriberAccess, platform),
      bridgeUrl: agent.bridgeUrl,
      devBridgeUrl: agent.devBridgeUrl,
      devBridgeActive: agent.devBridgeActive,
    };
  }

  /**
   * Fails open to "branded" (`false`) so a transient organization-lookup error
   * never strips the free-plan watermark — and never breaks delivery.
   */
  private async resolveRemoveNovuBranding(organizationId: string): Promise<boolean> {
    try {
      const organization = await this.organizationRepository.findById(organizationId, '_id removeNovuBranding');

      return organization?.removeNovuBranding === true;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), organizationId },
        'Failed to resolve removeNovuBranding; defaulting to branded'
      );

      return false;
    }
  }

  /**
   * Resolve the Slack workspace bot token for this integration.
   *
   * Workspace bot tokens live on channel connections (created by Slack OAuth), one per installed
   * workspace. A single Novu-hosted Slack app can be installed across many customer workspaces
   * (the NovuCopilot distribution model), so the token must be resolved per workspace:
   *
   *  1. When a `workspaceId` (Slack `team_id`) is provided, return the token of the connection
   *     created for that exact workspace.
   *  2. Otherwise — or when no per-workspace connection matches — fall back to the first connection
   *     that carries a token. This preserves the historical single-workspace behavior and heals
   *     legacy connections created before `workspace.id` was persisted.
   */
  async resolveSlackBotToken(
    environmentId: string,
    organizationId: string,
    integrationIdentifier: string,
    workspaceId?: string
  ): Promise<string | undefined> {
    const resolved = await this.findSlackConnectionWithToken(
      environmentId,
      organizationId,
      integrationIdentifier,
      workspaceId
    );

    return resolved?.token;
  }

  /**
   * Resolve the Slack workspace installation (bot token + bot user id) for an inbound event.
   *
   * In multi-workspace mode the adapter has no default bot token, so `auth.test` is never called at
   * init and the bot's own user id is unknown — which breaks channel-mention detection (the SDK looks
   * for `<@botUserId>` / `@botUserId` in the message text). We persist `bot_user_id` at OAuth install
   * time; for legacy connections created before that, this method lazily backfills it by calling
   * `auth.test` with the workspace bot token and writing the result onto the connection so subsequent
   * events skip the extra call.
   *
   * Fails soft: a missing/failed backfill returns the token with `botUserId` undefined — mention
   * detection then falls back to the `app_mention` event path rather than crashing the webhook.
   */
  async resolveSlackInstallation(
    environmentId: string,
    organizationId: string,
    integrationIdentifier: string,
    workspaceId?: string
  ): Promise<{ token: string; botUserId?: string } | undefined> {
    const resolved = await this.findSlackConnectionWithToken(
      environmentId,
      organizationId,
      integrationIdentifier,
      workspaceId
    );

    if (!resolved) {
      return undefined;
    }

    const { connection, token } = resolved;
    const botUserId =
      connection.workspace?.botUserId ??
      (await this.backfillSlackBotUserId(environmentId, organizationId, connection, token));

    return { token, botUserId };
  }

  private async findSlackConnectionWithToken(
    environmentId: string,
    organizationId: string,
    integrationIdentifier: string,
    workspaceId?: string
  ): Promise<{ connection: ChannelConnectionEntity; token: string } | undefined> {
    if (workspaceId) {
      const connection = await this.channelConnectionRepository.findOne(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          integrationIdentifier,
          'workspace.id': workspaceId,
        },
        'auth workspace identifier integrationIdentifier'
      );

      const decryptedAuth = connection ? decryptChannelConnectionAuth(connection.auth) : undefined;
      if (connection && decryptedAuth?.accessToken) {
        return { connection, token: decryptedAuth.accessToken };
      }
    }

    const connections = await this.channelConnectionRepository.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        integrationIdentifier,
      },
      'auth workspace identifier integrationIdentifier'
    );

    for (const connection of connections) {
      const decryptedAuth = decryptChannelConnectionAuth(connection.auth);
      if (decryptedAuth?.accessToken) {
        return { connection, token: decryptedAuth.accessToken };
      }
    }

    return undefined;
  }

  /**
   * Resolve the bot's Slack user id for a workspace token via `auth.test` and persist it onto the
   * connection's `workspace.botUserId`. Best-effort: any failure returns `undefined` without throwing.
   */
  private async backfillSlackBotUserId(
    environmentId: string,
    organizationId: string,
    connection: ChannelConnectionEntity,
    token: string
  ): Promise<string | undefined> {
    try {
      const response = await axios.post<{ ok: boolean; user_id?: string; error?: string }>(
        'https://slack.com/api/auth.test',
        undefined,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botUserId = response.data?.ok ? response.data.user_id : undefined;
      if (!botUserId) {
        this.logger.warn(
          { integrationIdentifier: connection.integrationIdentifier, slackError: response.data?.error },
          'Slack auth.test did not return a bot user id; skipping botUserId backfill'
        );

        return undefined;
      }

      await this.channelConnectionRepository.update(
        {
          _environmentId: environmentId,
          _organizationId: organizationId,
          identifier: connection.identifier,
        },
        { $set: { 'workspace.botUserId': botUserId } }
      );

      return botUserId;
    } catch (err) {
      this.logger.warn(
        { err: toLogSafeError(err), integrationIdentifier: connection.integrationIdentifier },
        'Failed to backfill Slack botUserId; continuing without it'
      );

      return undefined;
    }
  }

  /**
   * Slack/Telegram setup can persist credentials and register a webhook URL before the
   * dashboard link step completes, leaving an orphaned integration. On the first real
   * inbound webhook, attach the integration to the agent when it is not linked anywhere
   * else in this environment.
   */
  private async tryHealMissingAgentIntegrationLink(params: {
    agentId: string;
    agentIdentifier: string;
    integration: IntegrationEntity;
    integrationIdentifier: string;
    environmentId: string;
    organizationId: string;
    source?: AgentConfigResolveSource;
  }): Promise<AgentIntegrationEntity | null> {
    if (params.source !== 'webhook_message') {
      return null;
    }

    const existingForIntegration = await this.agentIntegrationRepository.findOne(
      {
        _integrationId: params.integration._id,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_id', '_agentId']
    );

    if (existingForIntegration) {
      this.logger.warn(
        {
          agentId: params.agentId,
          integrationIdentifier: params.integrationIdentifier,
          linkedAgentId: existingForIntegration._agentId,
        },
        'Inbound webhook targets an integration already linked to a different agent'
      );

      return null;
    }

    let link: AgentIntegrationEntity;

    try {
      link = await this.agentIntegrationRepository.create({
        _agentId: params.agentId,
        _integrationId: params.integration._id,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      const winner = await this.agentIntegrationRepository.findOne(
        {
          _integrationId: params.integration._id,
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
        },
        '*'
      );

      if (!winner) {
        throw err;
      }

      if (winner._agentId !== params.agentId) {
        this.logger.warn(
          {
            agentId: params.agentId,
            integrationIdentifier: params.integrationIdentifier,
            linkedAgentId: winner._agentId,
          },
          'Inbound webhook targets an integration already linked to a different agent'
        );

        return null;
      }

      link = winner;
    }

    this.logger.info(
      {
        agentId: params.agentId,
        agentIdentifier: params.agentIdentifier,
        integrationIdentifier: params.integrationIdentifier,
        integrationId: params.integration._id,
      },
      'Auto-linked orphaned integration to agent on first inbound webhook'
    );

    return link;
  }
}
