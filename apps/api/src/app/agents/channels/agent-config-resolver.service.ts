import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptChannelConnectionAuth, decryptCredentials, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationEntity,
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  CommunityOrganizationRepository,
  ICredentialsEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import type { WellKnownEmoji } from 'chat';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { AgentInactiveException } from '../shared/errors/agent-inactive.exception';
import { AgentIntegrationDisconnectedException } from '../shared/errors/agent-integration-disconnected.exception';
import { esmImport } from '../shared/util/esm-import';
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
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
}

const DEFAULT_REACTION_ON_RESOLVED: WellKnownEmoji = 'check';

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
      isManaged: !!agent.managedRuntime,
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
   * Workspace bot tokens live on channel connections (created by Slack OAuth). Pick the
   * first connection for this integration that has an access token.
   */
  private async resolveSlackBotToken(
    environmentId: string,
    organizationId: string,
    integrationIdentifier: string
  ): Promise<string | undefined> {
    const connections = await this.channelConnectionRepository.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        integrationIdentifier,
      },
      'auth'
    );

    for (const connection of connections) {
      const decryptedAuth = decryptChannelConnectionAuth(connection.auth);
      if (decryptedAuth?.accessToken) {
        return decryptedAuth.accessToken;
      }
    }

    return undefined;
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
