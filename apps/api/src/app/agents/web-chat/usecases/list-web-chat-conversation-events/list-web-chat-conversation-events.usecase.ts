import { Injectable, NotFoundException } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationParticipantTypeEnum,
  ConversationRepository,
} from '@novu/dal';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import {
  type EventMapContext,
  mapNewestFirstEventActivities,
  WEB_CHAT_EVENT_ACTIVITY_FILTER,
} from '../../activity-to-events';
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
    private readonly activityRepository: ConversationActivityRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: ListWebChatConversationEventsCommand): Promise<EventPageResult> {
    const conversation = await this.conversationRepository.findOne(
      {
        identifier: command.conversationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
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

    const page = await this.activityRepository.listEventActivities({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId: conversation._id,
      before: command.before,
      limit: command.limit,
      filter: WEB_CHAT_EVENT_ACTIVITY_FILTER,
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
