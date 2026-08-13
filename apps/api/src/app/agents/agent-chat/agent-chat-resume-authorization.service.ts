import { Injectable } from '@nestjs/common';
import type { AgentChatSession } from '@novu/chat-adapter-agent-chat';
import { ConversationParticipantTypeEnum, ConversationRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { withAgentChatContextFilter } from './agent-chat-context-query.util';

@Injectable()
export class AgentChatResumeAuthorizationService {
  constructor(private readonly conversationRepository: ConversationRepository) {}

  /**
   * Participant + agent_chat + agent match. Returns false for any denial (404 semantics upstream).
   */
  async canResume(params: { conversationId: string; session: AgentChatSession; agentId: string }): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne(
      withAgentChatContextFilter(
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

    const isAgentChatConversation = conversation.channels.some(
      (channel) => channel.platform === AgentPlatformEnum.AGENT_CHAT
    );
    if (!isAgentChatConversation) {
      return false;
    }

    return conversation._agentId === params.agentId;
  }
}
