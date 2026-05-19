import { forwardRef, Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
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
import { HandleAgentReplyCommand } from '../usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../usecases/handle-agent-reply/handle-agent-reply.usecase';
import type { AgentExecutionParams } from './bridge-executor.service';

interface SessionContext {
  conversationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}

const MAX_CACHED_PROVIDERS = 200;
const PROVIDER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class ManagedAgentService implements OnModuleInit {
  private readonly providers: LRUCache<string, Provider>;
  private readonly sessionContext = new Map<string, SessionContext>();
  private edgeObserver: EdgeObserver | undefined;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    @Inject(forwardRef(() => HandleAgentReply))
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.providers = new LRUCache<string, Provider>({
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
    const provider = await this.getOrCreateProvider(agent, context.config.environmentId);
    const sessionId = context.conversation.externalSessionId ?? undefined;

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.message?.text ?? '' }]
      : await this.buildMessagesWithHistory(context);

    const result = provider.send({ messages, sessionId });

    result.sessionId
      .then(async (sid) => {
        this.sessionContext.set(sid, {
          conversationId: String(context.conversation._id),
          environmentId: context.config.environmentId,
          organizationId: context.config.organizationId,
          agentIdentifier: context.config.agentIdentifier,
          integrationIdentifier: context.config.integrationIdentifier,
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

  private buildOnSessionEvents(): SessionEventsFactory {
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

          await this.handleErrorEvent(ctx, sessionId, e.error);
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

    const ctx: SessionContext = {
      conversationId: String(conversation._id),
      environmentId: conversation._environmentId,
      organizationId: conversation._organizationId,
      agentIdentifier: agent.identifier,
      integrationIdentifier: integration?.identifier ?? '',
    };

    this.sessionContext.set(sessionId, ctx);

    return ctx;
  }

  private async handleErrorEvent(ctx: SessionContext, sessionId: string, error: Error): Promise<void> {
    if (error instanceof SessionExpiredError) {
      this.logger.warn(`Session ${sessionId} expired, clearing for next message`);
      await this.conversationRepository.clearExternalSessionId(ctx.environmentId, ctx.conversationId);

      return;
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

  private buildErrorMessage(err: unknown): string {
    if (err instanceof CredentialExpiredError) {
      return `Agent error: Credentials for "${err.serverName}" have expired. Please update them in your integration settings.`;
    }
    if (err instanceof McpServerError) {
      return `Agent error: MCP server "${err.serverName}" is unavailable (${err.statusCode ?? 'unknown status'}).`;
    }

    return 'The agent is temporarily unavailable. Please try again later.';
  }

  private async getOrCreateProvider(
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>,
    environmentId: string
  ): Promise<Provider> {
    if (!agent.managedRuntime) {
      throw new Error(`Agent ${agent._id} is not a managed agent`);
    }

    const key = `${agent.managedRuntime._integrationId}:${agent.managedRuntime.externalAgentId}`;
    let provider = this.providers.get(key);

    if (provider) {
      return provider;
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

    provider = this.createProvider(agent.managedRuntime.providerId, {
      apiKey: creds.apiKey,
      agentId: agent.managedRuntime.externalAgentId,
      environmentId: creds.externalEnvironmentId,
    });
    this.providers.set(key, provider);

    return provider;
  }

  private createProvider(
    providerId: AgentRuntimeProviderIdEnum,
    config: { apiKey: string; agentId: string; environmentId: string }
  ): Provider {
    switch (providerId) {
      case AgentRuntimeProviderIdEnum.Anthropic:
        return thalamus.anthropic({
          ...config,
          onSessionEvents: this.buildOnSessionEvents(),
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
