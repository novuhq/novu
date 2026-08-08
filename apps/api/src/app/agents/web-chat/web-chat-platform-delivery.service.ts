import { Injectable } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, shortId, WebSocketsQueueService } from '@novu/application-generic';
import {
  conversationIdFromThreadId,
  extractCardPlainText,
  type WebChatDeleteMessageParams,
  type WebChatDeliverMessageParams,
  type WebChatDeliverMessageResult,
  type WebChatEditMessageParams,
  type WebChatStartTypingParams,
} from '@novu/chat-adapter-web';
import { type ConversationEntity, ConversationParticipantTypeEnum, SubscriberRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import type { CardElement } from 'chat';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { ConversationEventSequenceService } from '../conversation-runtime/conversation/conversation-event-sequence.service';
import { OutboundDeliveryInfo } from '../conversation-runtime/egress/outbound-delivery-info.service';
import { WebChatEventFactory } from './web-chat-event.factory';

export type WebChatPlatformDeliveryContext = {
  agentId: string;
  config: ResolvedAgentConfig;
};

/**
 * Nest-owned platform callbacks for `@novu/chat-adapter-web`. Web has no
 * external platform, so this layer *is* the platform: it resolves the
 * conversation from the thread id, emits the live WS envelope, and reports
 * `{ messageId, sequence }` upward through {@link OutboundDeliveryInfo}.
 * For runtime-identified messages the gateway persists first, so sequence is
 * read from the saved activity rather than minted here.
 */
@Injectable()
export class WebChatPlatformDeliveryService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly eventSequenceService: ConversationEventSequenceService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly webSocketsQueueService: WebSocketsQueueService,
    private readonly eventFactory: WebChatEventFactory,
    private readonly deliveryInfo: OutboundDeliveryInfo,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createDeliverMessage(context: WebChatPlatformDeliveryContext) {
    return async ({
      threadId,
      content,
      richContent,
      messageId,
    }: WebChatDeliverMessageParams): Promise<WebChatDeliverMessageResult> => {
      // Caller-supplied id (AgentEvent messageId) keeps event→activity
      // idempotency and history rehydration on one id; otherwise mint.
      const platformMessageId = messageId ?? `act_${shortId(12)}`;
      const conversation = await this.resolveConversation(context, threadId);
      const sequence = await this.resolveLiveSequence(context, conversation, threadId, messageId, 'deliverMessage');
      this.deliveryInfo.report({ messageId: platformMessageId, sequence });

      if (conversation && sequence !== undefined) {
        const markdown = this.markdownForLiveEnvelope(content, richContent);
        const envelope = this.eventFactory.createMessageEnvelope({
          conversationId: conversation._id,
          conversationIdentifier: conversation.identifier,
          agentId: context.config.agentIdentifier,
          platformMessageId,
          content: { markdown },
          sequence,
        });
        await this.emitBestEffort(context, conversation, envelope);
      }

      return { id: platformMessageId, threadId };
    };
  }

  createEditMessage(context: WebChatPlatformDeliveryContext) {
    return async ({
      threadId,
      messageId,
      content,
      richContent,
    }: WebChatEditMessageParams): Promise<WebChatDeliverMessageResult> => {
      const conversation = await this.resolveConversation(context, threadId);
      const sequence = await this.mintSequence(context, conversation, threadId, 'editMessage');
      this.deliveryInfo.report({ sequence });

      if (conversation && sequence !== undefined) {
        const markdown = this.markdownForLiveEnvelope(content, richContent);
        const envelope = this.eventFactory.createEditEnvelope({
          conversationId: conversation._id,
          conversationIdentifier: conversation.identifier,
          agentId: context.config.agentIdentifier,
          platformMessageId: messageId,
          content: { markdown },
          sequence,
        });
        await this.emitBestEffort(context, conversation, envelope);
      }

      return { id: messageId, threadId };
    };
  }

  createDeleteMessage(context: WebChatPlatformDeliveryContext) {
    return async ({ threadId, messageId }: WebChatDeleteMessageParams): Promise<void> => {
      const conversation = await this.resolveConversation(context, threadId);
      const sequence = await this.mintSequence(context, conversation, threadId, 'deleteMessage');
      this.deliveryInfo.report({ sequence });

      if (conversation && sequence !== undefined) {
        const envelope = this.eventFactory.createDeleteEnvelope({
          conversationId: conversation._id,
          conversationIdentifier: conversation.identifier,
          agentId: context.config.agentIdentifier,
          platformMessageId: messageId,
          sequence,
        });
        await this.emitBestEffort(context, conversation, envelope);
      }
    };
  }

  createStartTyping(context: WebChatPlatformDeliveryContext) {
    return async ({ threadId, status }: WebChatStartTypingParams): Promise<void> => {
      const conversation = await this.resolveConversation(context, threadId);
      // Typing is ephemeral: it consumes a sequence (intentional gap in durable
      // history) but never persists, so nothing is reported upward.
      const sequence = await this.mintSequence(context, conversation, threadId, 'startTyping');

      if (!conversation || sequence === undefined) {
        return;
      }

      const typingState = status?.trim() ? 'on' : 'off';
      const envelope = this.eventFactory.createTypingEnvelope({
        conversationId: conversation._id,
        conversationIdentifier: conversation.identifier,
        agentId: context.config.agentIdentifier,
        sequence,
        state: typingState,
        ...(typingState === 'on' ? { status } : {}),
      });
      await this.emitBestEffort(context, conversation, envelope);
    };
  }

  private async resolveConversation(
    context: WebChatPlatformDeliveryContext,
    threadId: string
  ): Promise<ConversationEntity | null> {
    const byThread = await this.conversationService.findByPlatformThread(
      context.config.environmentId,
      context.config.organizationId,
      context.agentId,
      context.config.integrationId,
      threadId
    );
    if (byThread) {
      return byThread;
    }

    // Thread ids embed the public conversation identifier (`web_chat:conv_*`),
    // so gate replies posted before the channel is attached still resolve.
    return this.conversationService.findByPublicIdentifier(
      context.config.environmentId,
      context.config.organizationId,
      conversationIdFromThreadId(threadId)
    );
  }

  private async resolveLiveSequence(
    context: WebChatPlatformDeliveryContext,
    conversation: ConversationEntity | null,
    threadId: string,
    runtimeMessageId: string | undefined,
    op: string
  ): Promise<number | undefined> {
    if (runtimeMessageId && conversation) {
      const persisted = await this.conversationService.findAgentMessageByIdentifier(
        context.config.environmentId,
        conversation._id,
        runtimeMessageId
      );
      if (persisted?.sequence !== undefined) {
        return persisted.sequence;
      }
    }

    return this.mintSequence(context, conversation, threadId, op);
  }

  private async mintSequence(
    context: WebChatPlatformDeliveryContext,
    conversation: ConversationEntity | null,
    threadId: string,
    op: string
  ): Promise<number | undefined> {
    if (!conversation) {
      this.logger.warn(
        { threadId, agentId: context.agentId, op },
        'web chat live emit skipped: conversation not found for thread'
      );

      return undefined;
    }

    return this.eventSequenceService.mint({
      environmentId: context.config.environmentId,
      organizationId: context.config.organizationId,
      conversationId: conversation._id,
    });
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

  private async emitBestEffort(
    context: WebChatPlatformDeliveryContext,
    conversation: ConversationEntity,
    envelope: AgentEventEnvelope
  ): Promise<void> {
    try {
      const subscriberExternalId = conversation.participants.find(
        (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
      )?.id;

      if (!subscriberExternalId) {
        this.logger.warn(
          { conversationId: conversation._id, agentId: context.agentId },
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
      // WS is best-effort — durable persistence continues in OutboundGateway.
      this.logger.warn(
        { err, conversationId: conversation._id, sequence: envelope.sequence },
        'web chat live WS enqueue failed'
      );
    }
  }
}
