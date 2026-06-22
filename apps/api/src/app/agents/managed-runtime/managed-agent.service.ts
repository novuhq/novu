import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type IAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationEntity,
  ConversationRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { type Message, MessageRole, type SerializedRequestParams } from '@novu/thalamus';
import { createWebhookHandler, type WebhookHandler } from '@novu/thalamus/webhook';
import type { Request, Response } from 'express';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { InboundAckService } from '../conversation-runtime/ack/inbound-ack.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { AgentMcpSessionService } from '../mcp/runtime/agent-mcp-session.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { AgentRuntimeDefinitionService } from './agent-runtime-definition.service';
import { DemoClaudeQuotaPolicy } from './demo-claude-quota-policy.service';
import { ManagedAgentEventHandler } from './managed-agent-event-handler.service';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory.service';

export interface ManagedAgentContext {
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  userMessageText: string;
  platformThreadId?: string;
  platformMessageId?: string;
}

interface WebhookSessionMetadata {
  conversationId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  agentId: string;
  subscriberId: string;
  platform: AgentPlatformEnum;
  platformThreadId: string;
  platformMessageId?: string;
  firstPlatformMessageId?: string;
  acknowledgeOnReceived?: boolean;
  suppressReply?: boolean;
}

export type ManagedAgentDispatchStatus = 'active' | 'queued';

export interface ManagedAgentDispatchResult {
  status: ManagedAgentDispatchStatus;
}

@Injectable()
export class ManagedAgentService implements OnModuleInit {
  private webhookHandler: WebhookHandler | undefined;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly eventHandler: ManagedAgentEventHandler,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly conversationService: AgentConversationService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpSessionService: AgentMcpSessionService,
    private readonly demoQuota: DemoClaudeQuotaPolicy,
    private readonly inboundAck: InboundAckService,
    private readonly agentRuntimeDefinition: AgentRuntimeDefinitionService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  onModuleInit() {
    this.webhookHandler = this.initWebhookHandler();
  }

  async dispatch(
    context: ManagedAgentContext,
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>
  ): Promise<ManagedAgentDispatchResult> {
    await this.demoQuota.assertAllowed(context, agent);

    // Backfill Novu-owned platform config (e.g. novu_tools) on agents created before the
    // current definition version. Fail-open: never blocks the message.
    await this.agentRuntimeDefinition.reconcileIfStale({
      agentId: agent._id,
      environmentId: context.config.environmentId,
      organizationId: context.config.organizationId,
    });

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

    const connectedMcpServers = await this.agentMcpSessionService.resolveConnectedMcps({
      agentId: agent._id,
      environmentId: context.config.environmentId,
      organizationId: context.config.organizationId,
      subscriberMongoId: context.subscriber?._id,
    });

    const messages = sessionId
      ? [{ role: MessageRole.USER, content: context.userMessageText }]
      : await this.buildMessagesWithHistory(context);

    const sendResult = await provider.send({
      messages,
      sessionId,
      vaultIds,
      ...(connectedMcpServers ? { agent: { mcpServers: connectedMcpServers } } : {}),
      webhookMetadata: this.buildWebhookMetadata({
        conversationId: String(context.conversation._id),
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        agentIdentifier: context.config.agentIdentifier,
        integrationIdentifier: context.config.integrationIdentifier,
        agentId: agent._id,
        subscriberId: context.subscriber?.subscriberId ?? '',
        platform: context.config.platform,
        platformThreadId: context.platformThreadId ?? context.conversation.channels?.[0]?.platformThreadId ?? '',
        platformMessageId: context.platformMessageId,
        firstPlatformMessageId: context.conversation.channels?.[0]?.firstPlatformMessageId,
        acknowledgeOnReceived: context.config.acknowledgeOnReceived,
      }),
    });

    await this.conversationRepository.setExternalSessionIdIfMissing(
      context.config.environmentId,
      String(context.conversation._id),
      sendResult.sessionId,
      vaultIds[0]
    );

    return { status: sendResult.status };
  }

  /**
   * Re-dispatch a user turn that was parked while managed-agent setup completed.
   * Loads the persisted inbound activity and forwards only its body to dispatch.
   */
  async replayParkedInboundTurn(params: {
    conversation: ConversationEntity;
    config: ResolvedAgentConfig;
    subscriber: SubscriberEntity;
    pendingPlatformMessageId: string;
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>;
  }): Promise<ManagedAgentDispatchResult | null> {
    const activity = await this.conversationActivityRepository.findOne(
      {
        _conversationId: params.conversation._id,
        _environmentId: params.config.environmentId,
        platformMessageId: params.pendingPlatformMessageId,
      },
      '*'
    );

    if (!activity) {
      this.logger.warn(
        { conversationId: params.conversation._id, pendingPlatformMessageId: params.pendingPlatformMessageId },
        'Managed agent setup completed but parked message was not found'
      );

      return null;
    }

    return this.dispatch(
      {
        config: params.config,
        conversation: params.conversation,
        subscriber: params.subscriber,
        userMessageText: activity.content,
        platformThreadId: params.conversation.channels?.[0]?.platformThreadId,
        platformMessageId: params.pendingPlatformMessageId,
      },
      params.agent
    );
  }

  /**
   * Resume a session that was parked in `requires-action` by sending the
   * user's verdict back through the provider as `toolResults` entries.
   * Accepts one or more tool IDs (per-tool approval or batch Approve All).
   */
  async sendToolResult(params: {
    conversationId: string;
    environmentId: string;
    organizationId: string;
    agentIdentifier: string;
    integrationIdentifier: string;
    subscriberId?: string;
    toolUseId: string;
    approved?: boolean;
    content?: string;
    followUpMessage?: string;
    platform: AgentPlatformEnum;
    platformThreadId: string;
    suppressReply?: boolean;
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
    const channel = conversation.channels?.[0];

    const isToolApproval = params.approved !== undefined;
    const connectedMcpServers = isToolApproval
      ? undefined
      : await this.agentMcpSessionService.resolveConnectedMcps({
          agentId: agent._id,
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          subscriberMongoId,
        });

    const webhookMetadata = this.buildWebhookMetadata({
      conversationId: params.conversationId,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentIdentifier: params.agentIdentifier,
      integrationIdentifier: params.integrationIdentifier,
      agentId: agent._id,
      subscriberId: params.subscriberId ?? '',
      platform: params.platform,
      platformThreadId: params.platformThreadId,
      firstPlatformMessageId: channel?.firstPlatformMessageId,
      suppressReply: params.suppressReply,
    });

    await provider.send({
      messages: [],
      sessionId,
      vaultIds,
      ...(connectedMcpServers ? { agent: { mcpServers: connectedMcpServers } } : {}),
      toolResults: [
        {
          toolUseId: params.toolUseId,
          ...(params.approved !== undefined ? { approved: params.approved } : {}),
          content: params.content ? [{ type: 'text' as const, text: params.content }] : [],
        },
      ],
      webhookMetadata,
    });

    if (params.followUpMessage) {
      const { suppressReply: _, ...followUpMetadata } = webhookMetadata;
      await provider.send({
        messages: [{ role: MessageRole.USER, content: params.followUpMessage }],
        sessionId,
        vaultIds,
        ...(connectedMcpServers ? { agent: { mcpServers: connectedMcpServers } } : {}),
        webhookMetadata: followUpMetadata,
      });
    }
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
    context: ManagedAgentContext,
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
      onQueueReady: async (params) => {
        /**
         * The observer queued this message while a previous turn was running.
         * It can't dispatch directly (no SDK/credentials), so it sends the
         * original request params back here for us to dispatch via the provider.
         */
        await this.handleQueueReady(params);
      },
    });
  }

  private async handleQueueReady(params: {
    sessionId: string;
    runId: string;
    turnId: string;
    request: SerializedRequestParams;
  }): Promise<void> {
    const metadata = params.request.webhookMetadata;
    if (!metadata?.agentIdentifier || !metadata?.environmentId) {
      this.logger.warn({ sessionId: params.sessionId }, 'queue-ready missing agentIdentifier or environmentId');

      return;
    }

    const provider = await this.providerFactory.tryGetProviderByAgentIdentifier(
      metadata.agentIdentifier,
      metadata.environmentId
    );

    if (!provider) {
      this.logger.warn(
        { sessionId: params.sessionId, agentIdentifier: metadata.agentIdentifier },
        'queue-ready: could not resolve provider'
      );

      return;
    }

    await this.inboundAck.onManagedQueueReady(metadata);

    await provider.dispatchQueued(params.sessionId, params.runId, params.turnId, params.request);
  }

  private async buildMessagesWithHistory(context: ManagedAgentContext): Promise<Message[]> {
    const history = await this.conversationService.getHistory(
      context.config.environmentId,
      String(context.conversation._id)
    );

    const messages: Message[] = history
      .filter((entry) => entry.type !== ConversationActivityTypeEnum.SIGNAL)
      .reverse()
      .map((entry) => ({
        role: entry.senderType === ConversationActivitySenderTypeEnum.AGENT ? MessageRole.ASSISTANT : MessageRole.USER,
        content: entry.content,
      }));

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

    return this.agentMcpSessionService.resolveVaultIds({
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
      agentId: input.agentId,
      subscriberId: input.subscriberId,
      platform: input.platform,
      platformThreadId: input.platformThreadId,
    };

    if (input.acknowledgeOnReceived !== undefined) {
      metadata.acknowledgeOnReceived = String(input.acknowledgeOnReceived);
    }

    if (input.platformMessageId) {
      metadata.platformMessageId = input.platformMessageId;
    }

    if (input.firstPlatformMessageId) {
      metadata.firstPlatformMessageId = input.firstPlatformMessageId;
    }

    if (input.suppressReply) {
      metadata.suppressReply = 'true';
    }

    return metadata;
  }
}
