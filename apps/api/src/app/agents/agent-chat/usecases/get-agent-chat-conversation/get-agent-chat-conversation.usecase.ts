import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, ConversationParticipantTypeEnum, ConversationRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { withAgentChatContextFilter } from '../../agent-chat-context-query.util';
import type { AgentChatConversationMetadataDto } from '../../dtos/agent-chat-conversation.dto';
import { GetAgentChatConversationCommand } from './get-agent-chat-conversation.command';

@Injectable()
export class GetAgentChatConversation {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: GetAgentChatConversationCommand): Promise<AgentChatConversationMetadataDto> {
    const conversation = await this.conversationRepository.findOne(
      withAgentChatContextFilter(
        this.conversationRepository,
        {
          identifier: command.conversationIdentifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        command.contextKeys
      ),
      '*'
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (participant) =>
        participant.type === ConversationParticipantTypeEnum.SUBSCRIBER && participant.id === command.subscriberId
    );

    if (!isParticipant) {
      throw new NotFoundException('Conversation not found');
    }

    const isAgentChatConversation = conversation.channels.some(
      (channel) => channel.platform === AgentPlatformEnum.AGENT_CHAT
    );

    if (!isAgentChatConversation) {
      throw new NotFoundException('Conversation not found');
    }

    const agent = await this.agentRepository.findOne(
      { _id: conversation._agentId, _environmentId: command.environmentId },
      ['identifier']
    );

    if (!agent) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      identifier: conversation.identifier,
      title: conversation.title,
      status: conversation.status,
      agentIdentifier: agent.identifier,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
    };
  }
}
