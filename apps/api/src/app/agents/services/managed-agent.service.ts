import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
  cloudflare,
  McpServerError,
  type Message,
  MessageRole,
  SessionExpiredError,
  type StreamPart,
  thalamus,
  type WebhookProvider,
} from '@novu/thalamus';
import { createWebhookHandler, type WebhookHandler } from '@novu/thalamus/webhook';
import { LRUCache } from 'lru-cache';
import { HandleAgentReplyCommand } from '../usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../usecases/handle-agent-reply/handle-agent-reply.usecase';
import type { AgentExecutionParams } from './bridge-executor.service';

const MAX_CACHED_PROVIDERS = 200;
const PROVIDER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class ManagedAgentService {
  private readonly providers: LRUCache<string, WebhookProvider>;
  private readonly webhookHandler: WebhookHandler | undefined;

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    @Inject(forwardRef(() => HandleAgentReply))
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.providers = new LRUCache<string, WebhookProvider>({
      max: MAX_CACHED_PROVIDERS,
      ttl: PROVIDER_TTL_MS,
    });
    this.webhookHandler = this.initWebhookHandler();
  }

  async dispatch(context: AgentExecutionParams, agent: Pick<AgentEntity, '_id' | 'managedRuntime'>): Promise<void> {
    const provider = await this.getOrCreateProvider(agent, context.config.environmentId);
    const sessionId = context.conversation.externalSessionId ?? undefined;

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.message?.text ?? '' }]
      : await this.buildMessagesWithHistory(context);

    const newSessionId = await provider.send({
      messages,
      sessionId,
      webhookMetadata: {
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        conversationId: String(context.conversation._id),
        agentIdentifier: context.config.agentIdentifier,
        integrationIdentifier: context.config.integrationIdentifier,
      },
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
  ): Promise<WebhookProvider> {
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
}
