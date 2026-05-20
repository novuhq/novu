import { forwardRef, Inject, Injectable, type OnModuleInit } from '@nestjs/common';
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
  type EdgeObserver,
  McpServerError,
  type Message,
  MessageRole,
  type Provider,
  type SessionEventsFactory,
  SessionExpiredError,
  type StreamCallbacks,
  thalamus,
} from '@novu/thalamus';
import { LRUCache } from 'lru-cache';
import { GenerateMcpOAuthUrlCommand } from '../usecases/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../usecases/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { HandleAgentReplyCommand } from '../usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../usecases/handle-agent-reply/handle-agent-reply.usecase';
import { ParkManagedAgentTurnCommand } from '../usecases/park-managed-agent-turn/park-managed-agent-turn.command';
import { ParkManagedAgentTurn } from '../usecases/park-managed-agent-turn/park-managed-agent-turn.usecase';
import type { AgentExecutionParams } from './bridge-executor.service';

interface SessionContext {
  conversationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  /**
   * External subscriberId of the user who sent the message that opened this
   * session. Required to surface a Connect card when the upstream MCP needs
   * OAuth — `GenerateMcpOAuthUrl` and `ParkManagedAgentTurn` are both
   * subscriber-scoped.
   *
   * Optional: anonymous platform users (no subscriber resolved) still get a
   * session, but for them we fall through to the plain-text MCP-init error.
   */
  subscriberId?: string;
}

/**
 * Cached pair for a managed-agent's provider integration. We keep both the
 * streaming `Provider` and the in-repo `IAgentRuntimeProvider` together so
 * the session `onError` callback can call `parseMcpInitFailure(err)` without
 * having to re-decrypt integration credentials per error.
 */
interface CachedRuntime {
  provider: Provider;
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

@Injectable()
export class ManagedAgentService implements OnModuleInit {
  private readonly providers: LRUCache<string, CachedRuntime>;
  private readonly sessionContext = new Map<string, SessionContext>();
  private edgeObserver: EdgeObserver | undefined;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    @Inject(forwardRef(() => HandleAgentReply))
    private readonly handleAgentReply: HandleAgentReply,
    private readonly generateMcpOAuthUrl: GenerateMcpOAuthUrl,
    private readonly parkManagedAgentTurn: ParkManagedAgentTurn,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.providers = new LRUCache<string, CachedRuntime>({
      max: MAX_CACHED_PROVIDERS,
      ttl: PROVIDER_TTL_MS,
    });
    this.edgeObserver = this.initEdgeObserver();
  }

  async onModuleInit(): Promise<void> {
    if (!process.env.THALAMUS_CF_URL) return;

    try {
      await this.recoverActiveSessions();
    } catch (err) {
      this.logger.error(err, 'Failed to recover active sessions on startup');
    }
  }

  /**
   * Queries the CF worker for active sessions and creates providers only
   * for agents that have in-flight work. Thalamus reconnects WebSockets
   * to the DOs and flushes buffered events through onSessionEvents.
   */
  private async recoverActiveSessions(): Promise<void> {
    if (!this.edgeObserver) return;

    const activeSessionIds = await this.edgeObserver.listActive();
    if (!activeSessionIds.length) return;

    this.logger.info(`Recovering ${activeSessionIds.length} active session(s) from edge`);

    const conversations = await Promise.all(
      activeSessionIds.map((id) => this.conversationRepository.findByExternalSessionId(id))
    );

    const uniqueAgents = new Map(
      conversations
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [`${c._agentId}:${c._environmentId}`, { agentId: c._agentId, environmentId: c._environmentId }])
    );

    const results = await Promise.allSettled(
      [...uniqueAgents.values()].map(async ({ agentId, environmentId }) => {
        const agent = await this.agentRepository.findOne({ _id: agentId, _environmentId: environmentId } as any, [
          '_id',
          'managedRuntime',
        ]);
        if (!agent?.managedRuntime) return false;

        await this.getOrCreateProvider(agent, environmentId);

        return true;
      })
    );

    const initialized = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      for (const r of failed) {
        this.logger.warn(r.reason, 'Failed to initialize provider during recovery');
      }
    }

    this.logger.info(`Session recovery: ${initialized} provider(s) reconnected`);
  }

  async dispatch(context: AgentExecutionParams, agent: Pick<AgentEntity, '_id' | 'managedRuntime'>): Promise<void> {
    const { provider, vaultIds } = await this.getOrCreateProvider(agent, context.config.environmentId);
    const sessionId = context.conversation.externalSessionId ?? undefined;

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.message?.text ?? '' }]
      : await this.buildMessagesWithHistory(context);

    const result = provider.send({ messages, sessionId, vaultIds });

    // Stream errors (MCP init failure, provider faults, etc.) are surfaced through
    // `onSessionEvents.onError`, which handles the user-facing reply. The Thalamus
    // SDK ALSO rethrows the same error from the underlying `result.response` (an
    // auto-started stream promise we never await). Without an explicit `.catch()`
    // that rejection escapes as an unhandled promise rejection — and the API's
    // global `unhandledRejection` handler (see `bootstrap.ts`) calls
    // `process.exit(1)`, killing the process mid-webhook. That manifests as a
    // 502 at the ingress, a dangling Slack "Thinking…" indicator, and no error
    // reply ever reaching the user (because `onError`'s async work is aborted).
    // Absorb the rejection here; user-facing error reporting is the onError job.
    const streamResponse = (result as { response?: Promise<unknown> }).response;
    if (streamResponse && typeof streamResponse.catch === 'function') {
      streamResponse.catch((err) => {
        this.logger.debug(
          { err },
          'Provider stream rejected; user-facing reporting handled by onSessionEvents.onError'
        );
      });
    }

    result.sessionId
      .then(async (sid) => {
        this.sessionContext.set(sid, {
          conversationId: String(context.conversation._id),
          environmentId: context.config.environmentId,
          organizationId: context.config.organizationId,
          agentIdentifier: context.config.agentIdentifier,
          integrationIdentifier: context.config.integrationIdentifier,
          subscriberId: context.subscriber?.subscriberId,
        });

        await this.conversationRepository.setExternalSessionIdIfMissing(
          context.config.environmentId,
          String(context.conversation._id),
          sid
        );
      })
      .catch((err) => {
        this.logger.error(err, 'Failed to resolve provider session id');
      });
  }

  private buildOnSessionEvents(runtimeProvider: IAgentRuntimeProvider): SessionEventsFactory {
    return (initialSessionId: string): StreamCallbacks => {
      let sessionId = initialSessionId;

      return {
        onStreamStart: (e: { sessionId?: string }) => {
          if (e.sessionId) sessionId = e.sessionId;
        },
        onFinish: async (e) => {
          const ctx = await this.resolveSessionContext(sessionId);
          if (!ctx) return;

          try {
            await this.handleAgentReply.execute(
              HandleAgentReplyCommand.create({
                userId: 'system',
                organizationId: ctx.organizationId,
                environmentId: ctx.environmentId,
                conversationId: ctx.conversationId,
                agentIdentifier: ctx.agentIdentifier,
                integrationIdentifier: ctx.integrationIdentifier,
                reply: { markdown: e.response.content },
              })
            );
          } catch (err) {
            this.logger.error(err, `Failed to deliver reply for session ${sessionId}`);
          }

          this.sessionContext.delete(sessionId);
        },
        onError: async (e) => {
          const ctx = await this.resolveSessionContext(sessionId);
          if (!ctx) return;

          await this.handleErrorEvent(ctx, sessionId, e.error, runtimeProvider);
          this.sessionContext.delete(sessionId);
        },
      };
    };
  }

  /**
   * Resolves session context from the in-memory map (hot path) or
   * falls back to DB lookup (recovery after restart).
   */
  private async resolveSessionContext(sessionId: string): Promise<SessionContext | null> {
    const cached = this.sessionContext.get(sessionId);
    if (cached) return cached;

    const conversation = await this.conversationRepository.findByExternalSessionId(sessionId);
    if (!conversation) {
      this.logger.warn(`No conversation found for session ${sessionId}, skipping callback`);

      return null;
    }

    const agent = await this.agentRepository.findOne(
      { _id: conversation._agentId, _environmentId: conversation._environmentId },
      ['_id', 'identifier']
    );
    if (!agent) return null;

    const integration = conversation.channels[0]
      ? await this.integrationRepository.findOne({
          _id: conversation.channels[0]._integrationId,
          _environmentId: conversation._environmentId,
        })
      : null;

    // After a process restart we lose the in-memory `subscriberId` set in
    // `dispatch()`. Re-derive it from the conversation's subscriber
    // participant so the Connect-card path stays available on recovered
    // sessions; participants with `type: PLATFORM_USER` (anonymous) are
    // intentionally skipped — they can't be the target of a subscriber-scoped
    // OAuth flow.
    const subscriberParticipant = conversation.participants.find(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
    );

    const ctx: SessionContext = {
      conversationId: String(conversation._id),
      environmentId: conversation._environmentId,
      organizationId: conversation._organizationId,
      agentIdentifier: agent.identifier,
      integrationIdentifier: integration?.identifier ?? '',
      subscriberId: subscriberParticipant?.id,
    };

    this.sessionContext.set(sessionId, ctx);

    return ctx;
  }

  private async handleErrorEvent(
    ctx: SessionContext,
    sessionId: string,
    error: Error,
    runtimeProvider: IAgentRuntimeProvider
  ): Promise<void> {
    if (error instanceof SessionExpiredError) {
      this.logger.warn(`Session ${sessionId} expired, clearing for next message`);
      await this.conversationRepository.clearExternalSessionId(ctx.environmentId, ctx.conversationId);

      return;
    }

    // Lazy MCP OAuth: if the upstream MCP failed to initialise because the
    // runtime vault has no credential for this subscriber, post a Connect
    // card with a one-click authorize URL instead of a generic error. The
    // worker pipeline (#11156, BullMQ era) did the same dance — we ported it
    // here because the CF durable-session runtime owns the conversation now.
    const initFailure = runtimeProvider.parseMcpInitFailure(error);

    if (initFailure) {
      const delivered = await this.tryDeliverMcpConnectCard(ctx, sessionId, initFailure.mcpServerName);

      if (delivered) {
        return;
      }
    }

    const message = this.buildErrorMessage(error);

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: ctx.organizationId,
          environmentId: ctx.environmentId,
          conversationId: ctx.conversationId,
          agentIdentifier: ctx.agentIdentifier,
          integrationIdentifier: ctx.integrationIdentifier,
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
   *   3. Best-effort `ParkManagedAgentTurn` — records the connection's
   *      pending-turn metadata. Post #11156 the OAuth callback no longer
   *      auto-replays the parked turn (the CF DO owns the session), so a
   *      failure here is logged but does NOT block card delivery.
   *   4. Deliver `{ reply: { card: ConnectCard } }` via `HandleAgentReply`.
   */
  private async tryDeliverMcpConnectCard(
    ctx: SessionContext,
    sessionId: string,
    mcpServerName: string
  ): Promise<boolean> {
    if (!ctx.subscriberId) {
      this.logger.warn(
        { sessionId, mcpServerName, conversationId: ctx.conversationId },
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
          environmentId: ctx.environmentId,
          organizationId: ctx.organizationId,
          agentIdentifier: ctx.agentIdentifier,
          mcpId,
          subscriberId: ctx.subscriberId,
        })
      );
      authorizeUrl = result.authorizeUrl;
    } catch (err) {
      this.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          sessionId,
          mcpId,
          agentIdentifier: ctx.agentIdentifier,
        },
        'GenerateMcpOAuthUrl failed; falling back to plain-text MCP-init error'
      );

      return false;
    }

    // Parking is best-effort: post-#11156 the OAuth callback unsets it but
    // never auto-replays the turn (the CF DO owns the session), so a failed
    // park doesn't break the user-visible Connect flow. Log + continue.
    try {
      await this.parkManagedAgentTurn.execute(
        ParkManagedAgentTurnCommand.create({
          userId: 'system',
          environmentId: ctx.environmentId,
          organizationId: ctx.organizationId,
          agentIdentifier: ctx.agentIdentifier,
          mcpId,
          subscriberId: ctx.subscriberId,
          jobData: {
            runtime: 'managed-cf-durable-session',
            conversationId: ctx.conversationId,
            integrationIdentifier: ctx.integrationIdentifier,
            sessionId,
          },
        })
      );
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), sessionId, mcpId },
        'ParkManagedAgentTurn failed; proceeding with Connect card anyway'
      );
    }

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: ctx.organizationId,
          environmentId: ctx.environmentId,
          conversationId: ctx.conversationId,
          agentIdentifier: ctx.agentIdentifier,
          integrationIdentifier: ctx.integrationIdentifier,
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
    // (`MCP server '<name>' initialize failed: ...`). Anthropic's session continues
    // on its side, but Thalamus throws on the first session.error and our local
    // stream terminates — so we never receive the actual agent.message. Until
    // Thalamus stops treating MCP init errors as fatal, give the user an
    // actionable message instead of the generic "temporarily unavailable".
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
    const provider = this.createProvider(agent.managedRuntime.providerId, runtimeProvider, {
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
    runtimeProvider: IAgentRuntimeProvider,
    config: { apiKey: string; agentId: string; environmentId: string }
  ): Provider {
    switch (providerId) {
      case AgentRuntimeProviderIdEnum.Anthropic:
        return thalamus.anthropic({
          ...config,
          onSessionEvents: this.buildOnSessionEvents(runtimeProvider),
          durable: this.edgeObserver,
        });
      default:
        throw new Error(`Unsupported agent runtime provider: ${providerId}`);
    }
  }

  private initEdgeObserver(): EdgeObserver | undefined {
    const cfUrl = process.env.THALAMUS_CF_URL;
    if (!cfUrl) return undefined;

    return cloudflare({ url: cfUrl, apiKey: process.env.THALAMUS_CF_API_KEY });
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
}
