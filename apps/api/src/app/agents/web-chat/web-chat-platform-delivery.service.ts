import { Injectable } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, shortId, WebSocketsQueueService } from '@novu/application-generic';
import {
  conversationIdFromThreadId,
  extractCardPlainText,
  NovuWebChatAdapterImpl,
  type WebChatDeleteMessageParams,
  type WebChatDeliverMessageParams,
  type WebChatDeliverMessageResult,
  type WebChatEditMessageParams,
  type WebChatStartTypingParams,
} from '@novu/chat-adapter-web';
import { ConversationParticipantTypeEnum, ConversationRepository, SubscriberRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import type { CardElement } from 'chat';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { WebChatEventFactory } from './web-chat-event.factory';

export type WebChatPlatformDeliveryContext = {
  agentId: string;
  config: ResolvedAgentConfig;
};

export type WebChatLiveContext = {
  envelope?: AgentEventEnvelope;
  platformMessageId?: string;
  sequence?: number;
  conversationMongoId?: string;
};

/**
 * Nest-owned platform callbacks for `@novu/chat-adapter-web`.
 * Live fan-out only (no Mongo). Nest `persistDelivered` / `persistAgentEdit` /
 * `persistAgentDelete` own durable activities.
 */
@Injectable()
export class WebChatPlatformDeliveryService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly conversationRepository: ConversationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly webSocketsQueueService: WebSocketsQueueService,
    private readonly eventFactory: WebChatEventFactory,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createDeliverMessage(context: WebChatPlatformDeliveryContext) {
    return async ({
      threadId,
      content,
      richContent,
    }: WebChatDeliverMessageParams): Promise<WebChatDeliverMessageResult> => {
      const { conversation, platformMessageId, sequence, merge } = await this.beginLiveDelivery(context, threadId);
      const markdown = this.markdownForLiveEnvelope(content, richContent);

      const envelope = merge(
        this.eventFactory.createMessageEnvelope({
          conversationId: this.conversationIdForEnvelope(conversation, threadId),
          agentId: context.config.agentIdentifier,
          platformMessageId,
          content: { markdown },
          sequence,
        })
      );

      await this.emitBestEffort(context, conversation, envelope);

      return { id: platformMessageId, threadId, sequence };
    };
  }

  createEditMessage(context: WebChatPlatformDeliveryContext) {
    return async ({
      threadId,
      messageId,
      content,
      richContent,
    }: WebChatEditMessageParams): Promise<WebChatDeliverMessageResult> => {
      const { conversation, sequence, merge } = await this.beginLiveDelivery(context, threadId, {
        platformMessageId: messageId,
      });
      const markdown = this.markdownForLiveEnvelope(content, richContent);

      const envelope = merge(
        this.eventFactory.createEditEnvelope({
          conversationId: this.conversationIdForEnvelope(conversation, threadId),
          agentId: context.config.agentIdentifier,
          platformMessageId: messageId,
          content: { markdown },
          sequence,
        })
      );

      await this.emitBestEffort(context, conversation, envelope);

      return { id: messageId, threadId, sequence };
    };
  }

  createDeleteMessage(context: WebChatPlatformDeliveryContext) {
    return async ({ threadId, messageId }: WebChatDeleteMessageParams): Promise<void> => {
      const { conversation, sequence, merge } = await this.beginLiveDelivery(context, threadId, {
        platformMessageId: messageId,
      });

      const envelope = merge(
        this.eventFactory.createDeleteEnvelope({
          conversationId: this.conversationIdForEnvelope(conversation, threadId),
          agentId: context.config.agentIdentifier,
          platformMessageId: messageId,
          sequence,
        })
      );

      await this.emitBestEffort(context, conversation, envelope);
    };
  }

  createStartTyping(context: WebChatPlatformDeliveryContext) {
    return async ({ threadId, status }: WebChatStartTypingParams): Promise<void> => {
      const { conversation, sequence, merge } = await this.beginLiveDelivery(context, threadId);
      const typingState = status?.trim() ? 'on' : 'off';

      const envelope = merge(
        this.eventFactory.createTypingEnvelope({
          conversationId: this.conversationIdForEnvelope(conversation, threadId),
          agentId: context.config.agentIdentifier,
          sequence,
          state: typingState,
          ...(typingState === 'on' ? { status } : {}),
        })
      );

      await this.emitBestEffort(context, conversation, envelope);
    };
  }

  private readLiveContext(): WebChatLiveContext {
    const store = NovuWebChatAdapterImpl.getEventContext();
    if (!store || typeof store !== 'object') {
      return {};
    }

    return store as WebChatLiveContext;
  }

  private writeBackLiveContext(live: WebChatLiveContext, patch: Partial<WebChatLiveContext>): void {
    Object.assign(live, patch);
  }

  private async resolveConversation(context: WebChatPlatformDeliveryContext, threadId: string) {
    return this.conversationService.findByPlatformThread(
      context.config.environmentId,
      context.config.organizationId,
      context.agentId,
      context.config.integrationId,
      threadId
    );
  }

  private conversationIdForEnvelope(
    conversation: Awaited<ReturnType<AgentConversationService['findByPlatformThread']>>,
    threadId: string
  ): string {
    const live = this.readLiveContext();

    return conversation?._id ?? live.conversationMongoId ?? conversationIdFromThreadId(threadId);
  }

  private markdownForLiveEnvelope(content: string, richContent?: Record<string, unknown>): string {
    const trimmed = content?.trim() ?? '';
    if (trimmed && trimmed !== '[Card]') {
      return trimmed;
    }

    const card = richContent?.card;
    if (card && typeof card === 'object') {
      return extractCardPlainText(card as CardElement);
    }

    return trimmed || '[Card]';
  }

  private async beginLiveDelivery(
    context: WebChatPlatformDeliveryContext,
    threadId: string,
    ids: { platformMessageId?: string } = {}
  ): Promise<{
    conversation: Awaited<ReturnType<AgentConversationService['findByPlatformThread']>>;
    platformMessageId: string;
    sequence: number;
    merge: (built: AgentEventEnvelope) => AgentEventEnvelope;
  }> {
    const live = this.readLiveContext();
    const conversation = await this.resolveConversation(context, threadId);
    const platformMessageId = ids.platformMessageId ?? live.platformMessageId ?? `act_${shortId(12)}`;
    const sequence =
      live.sequence ??
      (conversation
        ? await this.conversationRepository.allocateWebDeliverySequence(
            context.config.environmentId,
            context.config.organizationId,
            conversation._id
          )
        : 1);
    this.writeBackLiveContext(live, { platformMessageId, sequence });

    return {
      conversation,
      platformMessageId,
      sequence,
      merge: (built) => this.eventFactory.mergeSourceEnvelope(live.envelope, built),
    };
  }

  private async emitBestEffort(
    context: WebChatPlatformDeliveryContext,
    conversation: Awaited<ReturnType<AgentConversationService['findByPlatformThread']>>,
    envelope: AgentEventEnvelope
  ): Promise<void> {
    try {
      const subscriberExternalId = conversation?.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      )?.id;

      if (!subscriberExternalId) {
        this.logger.warn(
          { conversationId: conversation?._id, agentId: context.agentId },
          'web chat live emit skipped: no subscriber participant'
        );

        return;
      }

      const subscriber = await this.subscriberRepository.findBySubscriberId(
        context.config.environmentId,
        subscriberExternalId
      );

      if (!subscriber) {
        this.logger.warn(
          { subscriberExternalId, environmentId: context.config.environmentId },
          'web chat live emit skipped: subscriber entity not found'
        );

        return;
      }

      await this.webSocketsQueueService.add({
        name: 'sendMessage',
        data: {
          event: WebSocketEventEnum.AGENT_EVENT,
          userId: subscriber._id,
          _environmentId: context.config.environmentId,
          _organizationId: context.config.organizationId,
          subscriberId: subscriber.subscriberId,
          payload: envelope as unknown as Record<string, unknown>,
          contextKeys: [],
        },
        groupId: context.config.organizationId,
      });
    } catch (err) {
      // WS is best-effort — durable persistence must continue.
      this.logger.warn(
        { err, conversationId: conversation?._id, sequence: envelope.sequence },
        'web chat live WS enqueue failed'
      );
    }
  }
}
