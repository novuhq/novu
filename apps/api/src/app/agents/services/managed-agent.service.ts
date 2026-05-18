import { Injectable } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import {
  type AgentEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import {
  CredentialExpiredError,
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
export class ManagedAgentService {
  private readonly providers: LRUCache<string, Provider>;
  private readonly sessionContext = new Map<string, SessionContext>();

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.providers = new LRUCache<string, Provider>({
      max: MAX_CACHED_PROVIDERS,
      ttl: PROVIDER_TTL_MS,
    });
  }

  async dispatch(context: AgentExecutionParams, agent: Pick<AgentEntity, '_id' | 'managedRuntime'>): Promise<void> {
    const provider = await this.getOrCreateProvider(agent, context.config.environmentId);
    const sessionId = context.conversation.externalSessionId ?? undefined;

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.message?.text ?? '' }]
      : await this.buildMessagesWithHistory(context);

    const result = provider.send({ messages, sessionId });

    result.sessionId.then(async (sid) => {
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
    });
  }

  private buildOnSessionEvents(): SessionEventsFactory {
    return (sessionId: string): StreamCallbacks => ({
      onFinish: async (e) => {
        const ctx = this.sessionContext.get(sessionId);
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
        const ctx = this.sessionContext.get(sessionId);
        if (!ctx) return;

        await this.handleErrorEvent(ctx, sessionId, e.error);
        this.sessionContext.delete(sessionId);
      },
    });
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

    provider = this.createProvider(agent.managedRuntime.providerId, {
      apiKey: creds.apiKey,
      agentId: agent.managedRuntime.externalAgentId,
      environmentId: creds.externalEnvironmentId as string,
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
          edgeObserver: this.resolveEdgeObserver(),
        });
      default:
        throw new Error(`Unsupported agent runtime provider: ${providerId}`);
    }
  }

  private resolveEdgeObserver() {
    const cfUrl = process.env.THALAMUS_CF_URL;
    if (!cfUrl) return undefined;

    const { cloudflare } = require('@novu/thalamus/durable');

    return cloudflare({ url: cfUrl });
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
