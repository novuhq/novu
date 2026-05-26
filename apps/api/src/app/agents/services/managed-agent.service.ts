import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type IAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { type Message, MessageRole } from '@novu/thalamus';
import { createWebhookHandler, type WebhookHandler } from '@novu/thalamus/webhook';
import type { Request, Response } from 'express';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import type { AgentExecutionParams } from './bridge-executor.service';
import { DemoClaudeQuotaPolicy } from './demo-claude-quota-policy.service';
import { ManagedAgentEventHandler } from './managed-agent-event-handler';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory';
import { McpConnectionVaultService } from './mcp-connection-vault.service';

type WebhookSessionMetadata = {
  conversationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  subscriberId?: string;
  platform?: AgentPlatformEnum;
};

@Injectable()
export class ManagedAgentService implements OnModuleInit {
  private webhookHandler: WebhookHandler | undefined;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly eventHandler: ManagedAgentEventHandler,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly mcpConnectionVaultService: McpConnectionVaultService,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  onModuleInit() {
    this.webhookHandler = this.initWebhookHandler();
  }

  async dispatch(context: AgentExecutionParams, agent: Pick<AgentEntity, '_id' | 'managedRuntime'>): Promise<void> {
    await this.demoQuota.assertAllowed(context, agent);

    const { provider, runtimeProvider } = await this.providerFactory.getOrCreate(agent, context.config.environmentId);
    const vaultIds = await this.resolveVaultIdsForTurn(
      agent,
      context.config.environmentId,
      context.config.organizationId,
      context.subscriber?._id,
      runtimeProvider
    );
    const existingSessionId = context.conversation.externalSessionId ?? undefined;
    const sessionId = await this.reconcileSessionIdForVaultBinding(context, vaultIds, existingSessionId);

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.message?.text ?? '' }]
      : await this.buildMessagesWithHistory(context);

    const { sessionId: newSessionId } = await provider.send({
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
        platform: context.config.platform,
      }),
    });

    await this.conversationRepository.setExternalSessionIdIfMissing(
      context.config.environmentId,
      String(context.conversation._id),
      newSessionId,
      vaultIds[0]
    );
  }

  /**
   * Resume a session that was parked in `requires-action` by sending the
   * user's verdict back through the provider as `toolResults` entries.
   * Accepts one or more tool IDs (per-tool approval or batch Approve All).
   */
  async confirmToolApproval(params: {
    conversationId: string;
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    subscriberId?: string;
    platform?: AgentPlatformEnum;
    toolUseIds: string[];
    approved: boolean;
    turnId: string;
  }): Promise<void> {
    const conversation = await this.conversationRepository.findOne(
      { _id: params.conversationId, _environmentId: params.environmentId, _organizationId: params.organizationId },
      '*'
    );

    if (!conversation?.externalSessionId) {
      this.logger.warn(
        { conversationId: params.conversationId, toolUseIds: params.toolUseIds },
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
        { conversationId: params.conversationId, toolUseIds: params.toolUseIds },
        'Ignoring tool-approval click — agent has no managedRuntime'
      );

      return;
    }

    const { provider, runtimeProvider } = await this.providerFactory.getOrCreate(agent, params.environmentId);
    const subscriberMongoId = params.subscriberId
      ? (await this.subscriberRepository.findBySubscriberId(params.environmentId, params.subscriberId))?._id
      : undefined;
    const vaultIds = await this.resolveVaultIdsForTurn(
      agent,
      params.environmentId,
      params.organizationId,
      subscriberMongoId,
      runtimeProvider
    );
    const sessionId = conversation.externalSessionId;

    const webhookMetadata = this.buildWebhookMetadata({
      conversationId: params.conversationId,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentIdentifier: params.agentIdentifier,
      integrationIdentifier: params.integrationIdentifier,
      subscriberId: params.subscriberId,
      platform: params.platform,
    });

    await provider.send({
      messages: [],
      sessionId,
      vaultIds,
      turnId: params.turnId,
      toolResults: params.toolUseIds.map((toolUseId) => ({ toolUseId, approved: params.approved, content: [] })),
      webhookMetadata,
    });
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    if (!this.webhookHandler) {
      res.status(503).json({ error: 'Webhook handler not configured' });

      return;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf-8') ?? JSON.stringify(req.body);
    const signature = req.headers['x-thalamus-signature'] as string | undefined;

    const result = await this.webhookHandler.handleRaw(rawBody, signature ?? null);

    res.status(result.status);
    if (result.body) {
      res.setHeader('Content-Type', 'application/json');
      res.send(result.body);
    } else {
      res.end();
    }
  }

  /**
   * Thalamus only applies `vault_ids` when creating a session. If a conversation
   * already has an `externalSessionId` that was opened against a different vault,
   * reset the session so the next `provider.send` opens a fresh one.
   */
  private async reconcileSessionIdForVaultBinding(
    context: AgentExecutionParams,
    vaultIds: string[],
    existingSessionId: string | undefined
  ): Promise<string | undefined> {
    if (!existingSessionId) {
      return existingSessionId;
    }

    const targetVaultId = vaultIds[0];
    const boundVaultId = context.conversation.managedSessionVaultId;

    if (boundVaultId === targetVaultId) {
      return existingSessionId;
    }

    await this.conversationRepository.clearExternalSessionId(
      context.config.environmentId,
      String(context.conversation._id)
    );

    return undefined;
  }

  private initWebhookHandler(): WebhookHandler | undefined {
    const secret = process.env.THALAMUS_WEBHOOK_SECRET;
    if (!secret) return undefined;

    return createWebhookHandler({
      secret,
      onSessionEvents: (context) => this.eventHandler.createHandlers(context),
    });
  }

  private async buildMessagesWithHistory(context: AgentExecutionParams): Promise<Message[]> {
    const history = await this.conversationActivityRepository.findByConversation(
      context.config.environmentId,
      String(context.conversation._id),
      50
    );

    const messages: Message[] = history
      .filter((entry) => entry.type !== ConversationActivityTypeEnum.SIGNAL)
      .reverse()
      .map((entry) => ({
        role: entry.senderType === ConversationActivitySenderTypeEnum.AGENT ? MessageRole.ASSISTANT : MessageRole.USER,
        content: entry.content,
      }));

    messages.push({ role: MessageRole.USER, content: context.message?.text ?? '' });

    return messages;
  }

  private async resolveVaultIdsForTurn(
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>,
    environmentId: string,
    organizationId: string,
    subscriberMongoId: string | undefined,
    runtimeProvider: IAgentRuntimeProvider
  ): Promise<string[]> {
    if (!agent.managedRuntime) {
      return [];
    }

    return this.mcpConnectionVaultService.resolveVaultIds({
      agentId: agent._id,
      environmentId,
      organizationId,
      subscriberMongoId,
      runtimeProvider,
    });
  }

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

    if (input.platform) {
      metadata.platform = input.platform;
    }

    return metadata;
  }
}
