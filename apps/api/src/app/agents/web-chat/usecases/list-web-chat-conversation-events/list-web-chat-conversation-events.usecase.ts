import { Injectable, NotFoundException } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import { AgentRepository, ConversationParticipantTypeEnum, ConversationRepository } from '@novu/dal';
import { ConversationActivityLedger } from '../../../conversation-runtime/conversation/conversation-activity-ledger';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { type EventMapContext, mapNewestFirstEventActivities } from '../../activity-to-events';
import { withWebChatContextFilter } from '../../web-chat-context-query.util';
import { ListWebChatConversationEventsCommand } from './list-web-chat-conversation-events.command';

interface EventPageResult {
  events: AgentEventEnvelope[];
  /** Cursor toward older history. Send it as `before`. Null when the beginning is reached. */
  olderCursor: string | null;
}

@Injectable()
export class ListWebChatConversationEvents {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityLedger: ConversationActivityLedger,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: ListWebChatConversationEventsCommand): Promise<EventPageResult> {
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

    const mapContext: EventMapContext = {
      conversationId: conversation._id,
      conversationIdentifier: conversation.identifier,
      agentIdentifier: agent.identifier,
    };

    const page = await this.activityLedger.listForView({
      view: 'client_events',
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId: conversation._id,
      before: command.before,
      limit: command.limit,
    });

    // Repo returns newest-first; mapper flips to chronological for the client.
    const events = mapNewestFirstEventActivities(page.data, mapContext);
    const oldestInPage = page.data[page.data.length - 1];

    return {
      events,
      olderCursor: page.hasMore && oldestInPage ? oldestInPage._id : null,
    };
  }
}
