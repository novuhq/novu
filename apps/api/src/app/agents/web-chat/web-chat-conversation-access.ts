import { NotFoundException } from '@nestjs/common';
import { type ConversationEntity, ConversationParticipantTypeEnum, type ConversationRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { withWebChatContextFilter } from './web-chat-context-query.util';

/**
 * The web-chat conversation a subscriber session may act on: same context, the subscriber is a participant, and the
 * conversation runs on web chat. Anything else is a 404, so another subscriber's conversation is not disclosed.
 */
export async function findSubscriberWebChatConversation(
  conversationRepository: ConversationRepository,
  params: {
    conversationIdentifier: string;
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    contextKeys?: string[];
  }
): Promise<ConversationEntity> {
  const conversation = await conversationRepository.findOne(
    withWebChatContextFilter(
      conversationRepository,
      {
        identifier: params.conversationIdentifier,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      params.contextKeys
    ),
    '*'
  );

  if (!conversation) {
    throw new NotFoundException('Conversation not found');
  }

  const isParticipant = conversation.participants.some(
    (participant) =>
      participant.type === ConversationParticipantTypeEnum.SUBSCRIBER && participant.id === params.subscriberId
  );

  if (!isParticipant) {
    throw new NotFoundException('Conversation not found');
  }

  const isWebChatConversation = conversation.channels.some(
    (channel) => channel.platform === AgentPlatformEnum.WEB_CHAT
  );

  if (!isWebChatConversation) {
    throw new NotFoundException('Conversation not found');
  }

  return conversation;
}
