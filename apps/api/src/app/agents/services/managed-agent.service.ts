import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { PendingToolApproval } from '@novu/application-generic';
import {
  decryptCredentials,
  getAgentRuntimeProvider,
  type IAgentRuntimeProvider,
  PinoLogger,
} from '@novu/application-generic';
import {
  type AgentEntity,
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { AgentRuntimeProviderIdEnum, MCP_SERVERS } from '@novu/shared';
import {
  CredentialExpiredError,
  cloudflare,
  McpServerError,
  type Message,
  MessageRole,
  SessionExpiredError,
  type StreamPart,
  type Response as ThalamusResponse,
  thalamus,
  type WebhookProvider,
} from '@novu/thalamus';
import { createWebhookHandler, type WebhookHandler } from '@novu/thalamus/webhook';
import { LRUCache } from 'lru-cache';
import { GenerateMcpOAuthUrlCommand } from '../usecases/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../usecases/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { HandleAgentReplyCommand } from '../usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../usecases/handle-agent-reply/handle-agent-reply.usecase';
import type { AgentExecutionParams } from './bridge-executor.service';

/**
 * Webhook metadata persisted on the Cloudflare durable session and replayed
 * back on every `StreamPart` the runtime emits. Mirrors the in-memory
 * `SessionContext` map from the pre-webhook architecture — every field needed
 * to resolve a reply target without a DB round-trip lives here.
 */
type WebhookSessionMetadata = {
  conversationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  /**
   * External subscriberId of the user who sent the message that opened this
   * session. Required to surface a Connect card when the upstream MCP needs
   * OAuth — `GenerateMcpOAuthUrl` is subscriber-scoped.
   *
   * Optional: anonymous platform users (no subscriber resolved) still get a
   * session, but for them we fall through to the plain-text MCP-init error.
   */
  subscriberId?: string;
};

/**
 * Cached pair for a managed-agent's provider integration. We keep both the
 * webhook `WebhookProvider` and the in-repo `IAgentRuntimeProvider` together
 * so the webhook `error` handler can call `parseMcpInitFailure(err)` without
 * having to re-decrypt integration credentials per error.
 */
interface CachedRuntime {
  provider: WebhookProvider;
  runtimeProvider: IAgentRuntimeProvider;
  // Anthropic-side vault that holds OAuth credentials for this integration's
  // MCP servers. Sessions must opt-in to vaults via `SessionCreateParams.vault_ids`
  // (otherwise Anthropic reports "no credential is stored" no matter how
  // perfectly the credential is provisioned). We cache it alongside the
  // provider so every `send` call can hand it to the Thalamus SDK as
  // `vaultIds`, which forwards it to `beta.sessions.create`.
  vaultIds: string[];
}

const MAX_CACHED_PROVIDERS = 200;
const PROVIDER_TTL_MS = 30 * 60 * 1000;

/**
 * Action-id prefix for Approve/Deny buttons rendered when an MCP toolset
 * (or a custom tool) configured with `permission_policy: ask` parks the
 * Anthropic session in `requires_action`. The id shape is
 * `mcp-approval:<verdict>:<toolUseId>` so the existing `AgentInboundHandler.handleAction`
 * routing can intercept clicks before they fall through to the bridge.
 */
const TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval' as const;

/**
 * Anthropic emits this exact `invalid_request_error` when a new
 * `user.message` event is appended to a session that is still waiting on a
 * `user.tool_confirmation` (or one of the other tool-result event types).
 * The wire shape is `Invalid user.message event at events[0]: waiting on
 * responses to events [sevt_...]`. We surface an Approve/Deny card instead
 * of the generic "temporarily unavailable" fallback so the user can unblock
 * the parked turn.
 */
const PARKED_SESSION_ERROR_PATTERN = /waiting on responses to events/i;

@Injectable()
export class ManagedAgentService {
  private readonly providers: LRUCache<string, CachedRuntime>;
  private readonly webhookHandler: WebhookHandler | undefined;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    @Inject(forwardRef(() => HandleAgentReply))
    private readonly handleAgentReply: HandleAgentReply,
    private readonly generateMcpOAuthUrl: GenerateMcpOAuthUrl,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.providers = new LRUCache<string, CachedRuntime>({
      max: MAX_CACHED_PROVIDERS,
      ttl: PROVIDER_TTL_MS,
    });
    this.webhookHandler = this.initWebhookHandler();
  }

  async dispatch(context: AgentExecutionParams, agent: Pick<AgentEntity, '_id' | 'managedRuntime'>): Promise<void> {
    const { provider, vaultIds } = await this.getOrCreateProvider(agent, context.config.environmentId);
    const sessionId = context.conversation.externalSessionId ?? undefined;

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.message?.text ?? '' }]
      : await this.buildMessagesWithHistory(context);

    const newSessionId = await provider.send({
      messages,
      sessionId,
      vaultIds,
      webhookMetadata: this.buildWebhookMetadata({
        conversationId: String(context.conversation._id),
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        agentIdentifier: context.config.agentIdentifier,
        integrationIdentifier: context.config.integrationIdentifier,
        subscriberId: context.subscriber?.subscriberId,
      }),
    });

    await this.conversationRepository.setExternalSessionIdIfMissing(
      context.config.environmentId,
      String(context.conversation._id),
      newSessionId
    );
  }

  getWebhookHandler(): WebhookHandler | undefined {
    return this.webhookHandler;
  }

  async handleWebhookEvent(sessionId: string, metadata: Record<string, string>, event: StreamPart): Promise<void> {
    if (!metadata.conversationId || !metadata.environmentId || !metadata.organizationId) {
      this.logger.error(`Webhook event missing required metadata: session=${sessionId}`);

      return;
    }

    switch (event.type) {
      case 'finish': {
        // `requires-action` means the session is parked on Anthropic's side
        // waiting for a `user.tool_confirmation`. Posting `event.response.content`
        // here would push an empty string to the chat platform (Slack 502 /
        // `no_text`) AND leave the user with no surface to approve. Render
        // an Approve/Deny card from the pending tool details and short-circuit
        // the normal reply path — `confirmToolApproval` resumes the session.
        if (event.response.finishReason === 'requires-action') {
          const runtimeProvider = await this.tryGetRuntimeProvider(metadata);
          if (runtimeProvider) {
            const delivered = await this.tryDeliverToolApprovalCard(
              metadata,
              sessionId,
              runtimeProvider,
              extractPendingToolApproval(event.response)
            );

            if (delivered) {
              return;
            }
          }
        }

        await this.handleAgentReply.execute(
          HandleAgentReplyCommand.create({
            userId: 'system',
            environmentId: metadata.environmentId,
            organizationId: metadata.organizationId,
            conversationId: metadata.conversationId,
            agentIdentifier: metadata.agentIdentifier ?? '',
            integrationIdentifier: metadata.integrationIdentifier ?? '',
            reply: { markdown: event.response.content },
          })
        );
        break;
      }

      case 'error': {
        await this.handleErrorEvent(metadata, sessionId, event.error);
        break;
      }

      default:
        break;
    }
  }

  private async handleErrorEvent(metadata: Record<string, string>, sessionId: string, error: Error): Promise<void> {
    if (error instanceof SessionExpiredError) {
      this.logger.warn(`Session ${sessionId} expired, clearing for next message`);
      await this.conversationRepository.clearExternalSessionId(metadata.environmentId, metadata.conversationId);

      return;
    }

    const runtimeProvider = await this.tryGetRuntimeProvider(metadata);

    // Parked-session 400: user sent a new `user.message` while a previous
    // turn is still waiting on `user.tool_confirmation`. Anthropic rejects
    // with `invalid_request_error` ("waiting on responses to events
    // [sevt_...]"). Surface the same Approve/Deny card the original
    // `requires-action` turn would have rendered so the user can unblock
    // without us round-tripping a useless "temporarily unavailable" reply.
    if (runtimeProvider && typeof error.message === 'string' && PARKED_SESSION_ERROR_PATTERN.test(error.message)) {
      const delivered = await this.tryDeliverToolApprovalCard(metadata, sessionId, runtimeProvider);

      if (delivered) {
        return;
      }
    }

    // Lazy MCP OAuth: if the upstream MCP failed to initialise because the
    // runtime vault has no credential for this subscriber, post a Connect
    // card with a one-click authorize URL instead of a generic error. The
    // worker pipeline (#11156, BullMQ era) did the same dance — we ported it
    // here because the CF durable-session runtime owns the conversation now.
    if (runtimeProvider) {
      const initFailure = runtimeProvider.parseMcpInitFailure(error);

      if (initFailure) {
        const delivered = await this.tryDeliverMcpConnectCard(metadata, sessionId, initFailure.mcpServerName);

        if (delivered) {
          return;
        }
      }
    }

    const message = this.buildErrorMessage(error);

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: metadata.organizationId,
          environmentId: metadata.environmentId,
          conversationId: metadata.conversationId,
          agentIdentifier: metadata.agentIdentifier ?? '',
          integrationIdentifier: metadata.integrationIdentifier ?? '',
          reply: { markdown: message },
        })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver error message for session ${sessionId}`);
    }
  }

  /**
   * Lazy-OAuth path for an MCP-init failure. Returns `true` when a Connect
   * card was successfully delivered to the user; `false` for any precondition
   * miss (anonymous user, unknown server, MCP not on the Novu-OAuth
   * allow-list, discovery failure, network error). Callers fall back to the
   * plain-text `buildErrorMessage` path so the user still sees *something*.
   *
   * Steps:
   *   1. Map the runtime-side server display name (e.g. "Linear") to a
   *      catalog `mcpId` ("linear"). Servers not in `MCP_SERVERS` return false.
   *   2. Call `GenerateMcpOAuthUrl` — discovers PRM/AS metadata, does
   *      per-subscriber DCR, mints the authorize URL, and upserts the
   *      `mcp_connection` row to `pending_oauth`.
   *   3. Deliver `{ reply: { card: ConnectCard } }` via `HandleAgentReply`.
   */
  private async tryDeliverMcpConnectCard(
    metadata: Record<string, string>,
    sessionId: string,
    mcpServerName: string
  ): Promise<boolean> {
    const subscriberId = await this.resolveSubscriberIdFromMetadata(metadata);

    if (!subscriberId) {
      this.logger.warn(
        { sessionId, mcpServerName, conversationId: metadata.conversationId },
        'Cannot offer MCP OAuth — session has no subscriber context (anonymous platform user)'
      );

      return false;
    }

    const mcpId = this.resolveMcpIdByName(mcpServerName);

    if (!mcpId) {
      this.logger.warn(
        { sessionId, mcpServerName },
        'MCP-init failure references a server not in MCP_SERVERS catalog; skipping Connect card'
      );

      return false;
    }

    let authorizeUrl: string;

    try {
      const result = await this.generateMcpOAuthUrl.execute(
        GenerateMcpOAuthUrlCommand.create({
          userId: 'system',
          environmentId: metadata.environmentId,
          organizationId: metadata.organizationId,
          agentIdentifier: metadata.agentIdentifier ?? '',
          mcpId,
          subscriberId,
        })
      );
      authorizeUrl = result.authorizeUrl;
    } catch (err) {
      this.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          sessionId,
          mcpId,
          agentIdentifier: metadata.agentIdentifier,
        },
        'GenerateMcpOAuthUrl failed; falling back to plain-text MCP-init error'
      );

      return false;
    }

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: metadata.organizationId,
          environmentId: metadata.environmentId,
          conversationId: metadata.conversationId,
          agentIdentifier: metadata.agentIdentifier ?? '',
          integrationIdentifier: metadata.integrationIdentifier ?? '',
          reply: { card: this.buildConnectCard(mcpServerName, authorizeUrl) },
        })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver Connect card for session ${sessionId}`);

      return false;
    }

    return true;
  }

  private resolveMcpIdByName(mcpServerName: string): string | undefined {
    const target = mcpServerName.toLowerCase();
    const match = MCP_SERVERS.find((s) => s.name.toLowerCase() === target);

    return match?.id;
  }

  /**
   * Card shape mirrors `buildNoBridgeReply` in `agent-inbound-handler.service.ts`
   * (the canonical `chat` package `CardElement`). The Slack adapter renders
   * `link-button` as a real button that opens `url` in the user's browser —
   * one click, and the user lands on the authorize page that
   * `GenerateMcpOAuthUrl` just minted.
   */
  private buildConnectCard(mcpServerName: string, authorizeUrl: string): Record<string, unknown> {
    return {
      type: 'card',
      children: [
        {
          type: 'text',
          content: `I need access to your ${mcpServerName} account to answer this. Connect ${mcpServerName} and I'll pick up where we left off — no need to retype your question.`,
        },
        { type: 'divider' },
        {
          type: 'actions',
          children: [
            {
              type: 'link-button',
              label: `Connect ${mcpServerName}`,
              url: authorizeUrl,
              style: 'primary',
            },
          ],
        },
      ],
    };
  }

  /**
   * Surface an Approve/Deny card for the single oldest pending tool-use
   * approval on the session. When `knownPending` is supplied (e.g. lifted
   * from the `finish` webhook event payload) we skip the round-trip to the
   * provider event log; otherwise we fall back to
   * `runtimeProvider.getPendingToolApproval(sessionId)`. Returns `true` when
   * the card was successfully delivered.
   */
  private async tryDeliverToolApprovalCard(
    metadata: Record<string, string>,
    sessionId: string,
    runtimeProvider: IAgentRuntimeProvider,
    knownPending?: PendingToolApproval | null
  ): Promise<boolean> {
    let pending: PendingToolApproval | null = knownPending ?? null;

    if (!pending) {
      try {
        pending = await runtimeProvider.getPendingToolApproval(sessionId);
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err), sessionId },
          'getPendingToolApproval failed; cannot render Approve/Deny card'
        );

        return false;
      }
    }

    if (!pending) {
      this.logger.warn(
        { sessionId, conversationId: metadata.conversationId },
        'Session is parked on requires-action but no pending tool approval was located'
      );

      return false;
    }

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: metadata.organizationId,
          environmentId: metadata.environmentId,
          conversationId: metadata.conversationId,
          agentIdentifier: metadata.agentIdentifier ?? '',
          integrationIdentifier: metadata.integrationIdentifier ?? '',
          reply: { card: this.buildToolApprovalCard(pending) },
        })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver tool-approval card for session ${sessionId}`);

      return false;
    }

    return true;
  }

  /**
   * Card shape mirrors `buildConnectCard` above. The two `button` children
   * carry `id`s of the form `mcp-approval:<verdict>:<toolUseId>` so the
   * existing `AgentInboundHandler.handleAction` routing can intercept the
   * click and call `confirmToolApproval` before falling through to the
   * bridge (the user-defined `onAction` handler shouldn't see
   * provider-internal tool-use ids).
   */
  private buildToolApprovalCard(pending: PendingToolApproval): Record<string, unknown> {
    const serverLabel = pending.mcpServerName ? ` from ${pending.mcpServerName}` : '';
    const inputPreview = formatToolInputPreview(pending.input);

    return {
      type: 'card',
      children: [
        {
          type: 'text',
          content: `I'd like to call \`${pending.toolName}\`${serverLabel} to answer this. Approve to let me run it, or deny to skip.`,
        },
        ...(inputPreview ? [{ type: 'text', content: inputPreview }] : []),
        { type: 'divider' },
        {
          type: 'actions',
          children: [
            {
              type: 'button',
              id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${pending.toolUseId}`,
              label: 'Approve',
              style: 'primary',
            },
            {
              type: 'button',
              id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${pending.toolUseId}`,
              label: 'Deny',
              style: 'danger',
            },
          ],
        },
      ],
    };
  }

  /**
   * Resume a session that was parked in `requires-action` by sending the
   * user's verdict back through the provider as a `toolResults` entry.
   * Anthropic accepts this as a `user.tool_confirmation` event and unblocks
   * the turn; the resumed stream completes via the same webhook pipeline,
   * so no extra delivery wiring is needed here.
   *
   * Public so `AgentInboundHandler.handleAction` can route
   * `mcp-approval:<verdict>:<toolUseId>` clicks here without re-implementing
   * provider/session lookup.
   */
  async confirmToolApproval(params: {
    conversationId: string;
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    subscriberId?: string;
    toolUseId: string;
    approved: boolean;
  }): Promise<void> {
    const conversation = await this.conversationRepository.findOne(
      { _id: params.conversationId, _environmentId: params.environmentId, _organizationId: params.organizationId },
      '*'
    );

    if (!conversation?.externalSessionId) {
      this.logger.warn(
        { conversationId: params.conversationId, toolUseId: params.toolUseId },
        'Ignoring tool-approval click — conversation has no externalSessionId (stale card or already resolved)'
      );

      return;
    }

    const agent = await this.agentRepository.findOne(
      { _id: conversation._agentId, _environmentId: params.environmentId },
      ['_id', 'managedRuntime']
    );

    if (!agent?.managedRuntime) {
      this.logger.warn(
        { conversationId: params.conversationId, toolUseId: params.toolUseId },
        'Ignoring tool-approval click — agent has no managedRuntime'
      );

      return;
    }

    const { provider, vaultIds } = await this.getOrCreateProvider(agent, params.environmentId);
    const sessionId = conversation.externalSessionId;

    await provider.send({
      messages: [],
      sessionId,
      vaultIds,
      toolResults: [{ toolUseId: params.toolUseId, approved: params.approved }],
      webhookMetadata: this.buildWebhookMetadata({
        conversationId: params.conversationId,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentIdentifier: params.agentIdentifier,
        integrationIdentifier: params.integrationIdentifier,
        subscriberId: params.subscriberId,
      }),
    });
  }

  private buildErrorMessage(err: unknown): string {
    if (err instanceof CredentialExpiredError) {
      return `Agent error: Credentials for "${err.serverName}" have expired. Please update them in your integration settings.`;
    }
    if (err instanceof McpServerError) {
      return `Agent error: MCP server "${err.serverName}" is unavailable (${err.statusCode ?? 'unknown status'}).`;
    }

    // Anthropic emits `session.error` with type `mcp_authentication_failed_error`
    // when an MCP server can't initialize (typically: no credential stored in the
    // vault, or the configured server URL doesn't match the vault entry). Thalamus
    // surfaces it as a generic ThalamusError carrying the message verbatim
    // (`MCP server '<name>' initialize failed: ...`). Until the lazy-OAuth Connect
    // card path can resolve the failure, give the user an actionable message
    // instead of the generic "temporarily unavailable".
    if (err instanceof Error) {
      const mcpInitMatch = err.message.match(/MCP server ['"]([^'"]+)['"] initialize failed/i);
      if (mcpInitMatch) {
        const serverName = mcpInitMatch[1];

        return (
          `I couldn't connect to the **${serverName}** MCP server — no credential is stored for it. ` +
          `Connect ${serverName} from this agent's integration settings (or remove it from the agent's MCP list) and try again.`
        );
      }
    }

    return 'The agent is temporarily unavailable. Please try again later.';
  }

  private async getOrCreateProvider(
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>,
    environmentId: string
  ): Promise<CachedRuntime> {
    if (!agent.managedRuntime) {
      throw new Error(`Agent ${agent._id} is not a managed agent`);
    }

    const key = `${agent.managedRuntime._integrationId}:${agent.managedRuntime.externalAgentId}`;
    const cached = this.providers.get(key);

    if (cached) {
      return cached;
    }

    const integration = await this.integrationRepository.findOne({
      _id: agent.managedRuntime._integrationId,
      _environmentId: environmentId,
    });
    if (!integration?.credentials) {
      throw new Error(`Integration ${agent.managedRuntime._integrationId} not found or has no credentials`);
    }

    const creds = decryptCredentials(integration.credentials);
    if (!creds.apiKey) {
      throw new Error('Integration has no API key');
    }
    if (!creds.externalEnvironmentId) {
      throw new Error('Integration has no external environment id');
    }

    const runtimeProvider = getAgentRuntimeProvider(agent.managedRuntime.providerId, creds.apiKey);
    const provider = this.createProvider(agent.managedRuntime.providerId, {
      apiKey: creds.apiKey,
      agentId: agent.managedRuntime.externalAgentId,
      environmentId: creds.externalEnvironmentId,
    });
    const vaultIds = creds.externalVaultId ? [creds.externalVaultId as string] : [];
    const runtime: CachedRuntime = { provider, runtimeProvider, vaultIds };
    this.providers.set(key, runtime);

    return runtime;
  }

  private createProvider(
    providerId: AgentRuntimeProviderIdEnum,
    config: { apiKey: string; agentId: string; environmentId: string }
  ): WebhookProvider {
    const cfUrl = process.env.THALAMUS_CF_URL;
    if (!cfUrl) {
      throw new Error('THALAMUS_CF_URL is required for managed agents');
    }

    const webhookSecret = process.env.THALAMUS_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('THALAMUS_WEBHOOK_SECRET is required for managed agents');
    }

    switch (providerId) {
      case AgentRuntimeProviderIdEnum.Anthropic:
        return thalamus.anthropic({
          ...config,
          durable: cloudflare({
            url: cfUrl,
            apiKey: process.env.THALAMUS_CF_API_KEY,
            webhook: {
              url: `${process.env.API_ROOT_URL}/v1/agents/events`,
              secret: webhookSecret,
            },
          }),
        });
      default:
        throw new Error(`Unsupported agent runtime provider: ${providerId}`);
    }
  }

  private initWebhookHandler(): WebhookHandler | undefined {
    const secret = process.env.THALAMUS_WEBHOOK_SECRET;
    if (!secret) return undefined;

    return createWebhookHandler({
      secret,
      onSessionEvents: (sessionId, metadata) => ({
        onPart: (part) => {
          this.handleWebhookEvent(sessionId, metadata, part).catch((err) => {
            this.logger.error(err, `Failed to handle webhook event for session ${sessionId}`);
          });
        },
      }),
    });
  }

  private async buildMessagesWithHistory(context: AgentExecutionParams): Promise<Message[]> {
    const history = await this.conversationActivityRepository.findByConversation(
      context.config.environmentId,
      String(context.conversation._id),
      50
    );

    const messages: Message[] = history.reverse().map((entry) => ({
      role: entry.senderType === ConversationActivitySenderTypeEnum.AGENT ? MessageRole.ASSISTANT : MessageRole.USER,
      content: entry.content,
    }));

    messages.push({ role: MessageRole.USER, content: context.message?.text ?? '' });

    return messages;
  }

  /**
   * Build the webhookMetadata payload sent on every `provider.send`. Fields
   * are flattened to strings (the Thalamus webhook contract is
   * `Record<string, string>`) and the optional `subscriberId` is omitted
   * when absent so reads can use a truthy check.
   */
  private buildWebhookMetadata(input: WebhookSessionMetadata): Record<string, string> {
    const metadata: Record<string, string> = {
      conversationId: input.conversationId,
      environmentId: input.environmentId,
      organizationId: input.organizationId,
      agentIdentifier: input.agentIdentifier,
      integrationIdentifier: input.integrationIdentifier,
    };

    if (input.subscriberId) {
      metadata.subscriberId = input.subscriberId;
    }

    return metadata;
  }

  /**
   * Best-effort resolution of the cached runtime/provider for a webhook
   * event. Returns `null` when we can't recover the agent for the metadata
   * (deleted agent, missing managedRuntime, etc.) — callers fall back to the
   * generic plain-text error reply.
   */
  private async tryGetRuntimeProvider(metadata: Record<string, string>): Promise<IAgentRuntimeProvider | null> {
    if (!metadata.environmentId || !metadata.organizationId || !metadata.agentIdentifier) {
      return null;
    }

    try {
      const agent = await this.agentRepository.findOne(
        { identifier: metadata.agentIdentifier, _environmentId: metadata.environmentId },
        ['_id', 'managedRuntime']
      );

      if (!agent?.managedRuntime) {
        return null;
      }

      const { runtimeProvider } = await this.getOrCreateProvider(agent, metadata.environmentId);

      return runtimeProvider;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), agentIdentifier: metadata.agentIdentifier },
        'Failed to resolve runtime provider for webhook event'
      );

      return null;
    }
  }

  /**
   * Webhook metadata always carries `subscriberId` for sessions opened by a
   * subscriber (dispatch() sets it). After a process restart the metadata is
   * still authoritative — the CF DO replays it on every event — so we
   * normally read from there. As a defensive fallback (older sessions, code
   * paths that forgot to pass `subscriberId`), look up the conversation's
   * subscriber participant.
   */
  private async resolveSubscriberIdFromMetadata(metadata: Record<string, string>): Promise<string | undefined> {
    if (metadata.subscriberId) {
      return metadata.subscriberId;
    }

    if (!metadata.conversationId || !metadata.environmentId) {
      return undefined;
    }

    try {
      const conversation = await this.conversationRepository.findOne(
        { _id: metadata.conversationId, _environmentId: metadata.environmentId },
        '*'
      );

      const subscriberParticipant = conversation?.participants.find(
        (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
      );

      return subscriberParticipant?.id;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), conversationId: metadata.conversationId },
        'Failed to resolve subscriberId from conversation participants'
      );

      return undefined;
    }
  }
}

/**
 * Lift the single oldest pending `mcp-approval` (or `tool-confirmation`) out
 * of a Thalamus `Response.actionsRequired` array. Returns `null` when the
 * response carries no actionable approval — callers fall back to
 * `runtimeProvider.getPendingToolApproval(sessionId)` for the event-log walk.
 */
function extractPendingToolApproval(response: ThalamusResponse): PendingToolApproval | null {
  const actionsRequired = response.actionsRequired;
  if (!Array.isArray(actionsRequired) || actionsRequired.length === 0) {
    return null;
  }

  for (const action of actionsRequired) {
    if (action.type === 'mcp-approval') {
      return {
        toolUseId: action.toolUseId,
        toolName: action.toolName,
        mcpServerName: action.serverName,
        input: action.input,
      };
    }

    if (action.type === 'tool-confirmation') {
      return {
        toolUseId: action.toolUseId,
        toolName: action.toolName,
        input: action.input,
      };
    }
  }

  return null;
}

/**
 * Render the tool's input arguments as an inline code block so the user can
 * see what they're approving. Capped at 600 chars to stay well inside the
 * Slack block-kit text limit (3000) with room for the surrounding card.
 */
function formatToolInputPreview(input: Record<string, unknown> | undefined): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const keys = Object.keys(input);
  if (keys.length === 0) {
    return null;
  }

  let serialised: string;
  try {
    serialised = JSON.stringify(input, null, 2);
  } catch {
    return null;
  }

  const capped = serialised.length > 600 ? `${serialised.slice(0, 597)}...` : serialised;

  return `\`\`\`json\n${capped}\n\`\`\``;
}
