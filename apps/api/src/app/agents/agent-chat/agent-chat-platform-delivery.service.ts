import { Injectable } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger, shortId, WebSocketsQueueService } from '@novu/application-generic';
import {
  type AgentChatDeleteMessageParams,
  type AgentChatDeliverMessageParams,
  type AgentChatDeliverMessageResult,
  type AgentChatEditMessageParams,
  type AgentChatStartTypingParams,
  conversationIdFromThreadId,
} from '@novu/chat-adapter-agent-chat';
import { type ConversationEntity, ConversationParticipantTypeEnum, SubscriberRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { OutboundDeliveryInfo } from '../conversation-runtime/egress/outbound-delivery-info.service';
import { messageContentFromStored } from './activity-to-events';
import { AgentChatEventFactory } from './agent-chat-event.factory';

export type AgentChatPlatformDeliveryContext = {
  agentId: string;
  config: ResolvedAgentConfig;
};

/**
 * Nest-owned platform callbacks for `@novu/chat-adapter-agent-chat`. Agent chat has no
 * external platform, so this layer *is* the platform: it resolves the
 * conversation from the thread id, emits the live WS envelope, and reports
 * `{ messageId, sequence }` upward through {@link OutboundDeliveryInfo}.
 * For runtime-identified messages the gateway persists first, so sequence is
 * read from the saved activity rather than minted here.
 */
@Injectable()
export class AgentChatPlatformDeliveryService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly webSocketsQueueService: WebSocketsQueueService,
    private readonly eventFactory: AgentChatEventFactory,
    private readonly deliveryInfo: OutboundDeliveryInfo,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createDeliverMessage(context: AgentChatPlatformDeliveryContext) {
    return async ({
      threadId,
      content,
      richContent,
      messageId,
    }: AgentChatDeliverMessageParams): Promise<AgentChatDeliverMessageResult> => {
      // Caller-supplied id (AgentEvent messageId) keeps event→activity
      // idempotency and history rehydration on one id; otherwise mint.
      const platformMessageId = messageId ?? `act_${shortId(12)}`;
      const conversation = await this.resolveConversation(context, threadId);
      const sequence = await this.resolveLiveSequence(context, conversation, threadId, messageId, 'deliverMessage');
      this.deliveryInfo.report({ messageId: platformMessageId, sequence });

      if (conversation && sequence !== undefined) {
        const envelope = this.eventFactory.createMessageEnvelope({
          conversationId: conversation._id,
          conversationIdentifier: conversation.identifier,
          agentId: context.config.agentIdentifier,
          platformMessageId,
          content: messageContentFromStored({ content, richContent }),
          sequence,
        });
        await this.emitBestEffort(context, conversation, envelope);
      }

      return { id: platformMessageId, threadId };
    };
  }

  createEditMessage(context: AgentChatPlatformDeliveryContext) {
    return async ({
      threadId,
      messageId,
      content,
      richContent,
    }: AgentChatEditMessageParams): Promise<AgentChatDeliverMessageResult> => {
      const conversation = await this.resolveConversation(context, threadId);
      const sequence = await this.mintSequence(context, conversation, threadId, 'editMessage');
      this.deliveryInfo.report({ sequence });

      if (conversation && sequence !== undefined) {
        const envelope = this.eventFactory.createEditEnvelope({
          conversationId: conversation._id,
          conversationIdentifier: conversation.identifier,
          agentId: context.config.agentIdentifier,
          platformMessageId: messageId,
          content: messageContentFromStored({ content, richContent }),
          sequence,
        });
        await this.emitBestEffort(context, conversation, envelope);
      }

      return { id: messageId, threadId };
    };
  }

  createDeleteMessage(context: AgentChatPlatformDeliveryContext) {
    return async ({ threadId, messageId }: AgentChatDeleteMessageParams): Promise<void> => {
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

  createStartTyping(context: AgentChatPlatformDeliveryContext) {
    return async ({ threadId, status }: AgentChatStartTypingParams): Promise<void> => {
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
    context: AgentChatPlatformDeliveryContext,
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

    // Thread ids embed the public conversation identifier (`agent_chat:conv_*`),
    // so gate replies posted before the channel is attached still resolve.
    return this.conversationService.findByPublicIdentifier(
      context.config.environmentId,
      context.config.organizationId,
      conversationIdFromThreadId(threadId)
    );
  }

  private async resolveLiveSequence(
    context: AgentChatPlatformDeliveryContext,
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
    context: AgentChatPlatformDeliveryContext,
    conversation: ConversationEntity | null,
    threadId: string,
    op: string
  ): Promise<number | undefined> {
    if (!conversation) {
      this.logger.warn(
        { threadId, agentId: context.agentId, op },
        'agent chat live emit skipped: conversation not found for thread'
      );

      return undefined;
    }

    return this.conversationService.mintEventSequence({
      environmentId: context.config.environmentId,
      organizationId: context.config.organizationId,
      conversationId: conversation._id,
    });
  }

  private async emitBestEffort(
    context: AgentChatPlatformDeliveryContext,
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
          'agent chat live emit skipped: no subscriber participant'
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
          'agent chat live emit skipped: subscriber entity not found'
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
          contextKeys: conversation.contextKeys ?? [],
        },
        groupId: context.config.organizationId,
      });
    } catch (err) {
      // WS is best-effort — durable persistence continues in OutboundGateway.
      this.logger.warn(
        { err, conversationId: conversation._id, sequence: envelope.sequence },
        'agent chat live WS enqueue failed'
      );
    }
  }
}
