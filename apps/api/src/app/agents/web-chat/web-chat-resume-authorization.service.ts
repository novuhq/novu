import { Injectable } from '@nestjs/common';
import type { WebChatSession } from '@novu/chat-adapter-web-chat';
import { ConversationParticipantTypeEnum, ConversationRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { withWebChatContextFilter } from './web-chat-context-query.util';

@Injectable()
export class WebChatResumeAuthorizationService {
  constructor(private readonly conversationRepository: ConversationRepository) {}

  /**
   * Participant + web_chat + agent match. Returns false for any denial (404 semantics upstream).
   */
  async canResume(params: { conversationId: string; session: WebChatSession; agentId: string }): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne(
      withWebChatContextFilter(
        this.conversationRepository,
        {
          identifier: params.conversationId,
          _environmentId: params.session.environmentId,
          _organizationId: params.session.organizationId,
        },
        params.session.contextKeys
      ),
      '*'
    );

    if (!conversation) {
      return false;
    }

    const isParticipant = conversation.participants.some(
      (participant) =>
        participant.type === ConversationParticipantTypeEnum.SUBSCRIBER &&
        participant.id === params.session.subscriberId
    );
    if (!isParticipant) {
      return false;
    }

    const isWebChatConversation = conversation.channels.some(
      (channel) => channel.platform === AgentPlatformEnum.WEB_CHAT
    );
    if (!isWebChatConversation) {
      return false;
    }

    return conversation._agentId === params.agentId;
  }
}
