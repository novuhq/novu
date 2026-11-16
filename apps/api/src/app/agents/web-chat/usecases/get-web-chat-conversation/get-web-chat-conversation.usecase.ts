import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, ConversationRepository } from '@novu/dal';
import type { WebChatConversationMetadataDto } from '../../dtos/web-chat-conversation.dto';
import { findSubscriberWebChatConversation } from '../../web-chat-conversation-access';
import { GetWebChatConversationCommand } from './get-web-chat-conversation.command';

@Injectable()
export class GetWebChatConversation {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: GetWebChatConversationCommand): Promise<WebChatConversationMetadataDto> {
    const conversation = await findSubscriberWebChatConversation(this.conversationRepository, command);

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
