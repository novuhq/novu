import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, ConversationRepository } from '@novu/dal';
import { CancelConversationTurnCommand } from '../../../conversation-runtime/runtime/cancel-conversation-turn.command';
import {
  CancelConversationTurn,
  type CancelConversationTurnResult,
} from '../../../conversation-runtime/runtime/cancel-conversation-turn.usecase';
import { findSubscriberWebChatConversation } from '../../web-chat-conversation-access';
import { CancelWebChatConversationTurnCommand } from './cancel-web-chat-conversation-turn.command';

/** Stop for web chat: only a participant of the conversation, in the session's context, may stop its turn. */
@Injectable()
export class CancelWebChatConversationTurn {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly cancelConversationTurn: CancelConversationTurn
  ) {}

  async execute(command: CancelWebChatConversationTurnCommand): Promise<CancelConversationTurnResult> {
    const conversation = await findSubscriberWebChatConversation(this.conversationRepository, command);

    // Same agent match as resume: a client may only stop the conversation of the agent it talks to.
    if (command.agentIdentifier) {
      const agent = await this.agentRepository.findOne(
        {
          identifier: command.agentIdentifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        ['_id']
      );
      if (!agent || String(agent._id) !== conversation._agentId) {
        throw new NotFoundException('Conversation not found');
      }
    }

    return this.cancelConversationTurn.execute(
      CancelConversationTurnCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        conversationId: String(conversation._id),
        contextKeys: command.contextKeys ?? [],
      })
    );
  }
}
