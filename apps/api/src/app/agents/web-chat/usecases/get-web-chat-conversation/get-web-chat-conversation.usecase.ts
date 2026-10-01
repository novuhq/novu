import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, ConversationParticipantTypeEnum, ConversationRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { withWebChatContextFilter } from '../../web-chat-context-query.util';
import type { WebChatConversationMetadataDto } from '../../dtos/web-chat-conversation.dto';
import { GetWebChatConversationCommand } from './get-web-chat-conversation.command';

@Injectable()
export class GetWebChatConversation {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: GetWebChatConversationCommand): Promise<WebChatConversationMetadataDto> {
    const conversation = await this.conversationRepository.findOne(
      withWebChatContextFilter(
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

    const isWebChatConversation = conversation.channels.some(
      (channel) => channel.platform === AgentPlatformEnum.WEB_CHAT
    );

    if (!isWebChatConversation) {
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
