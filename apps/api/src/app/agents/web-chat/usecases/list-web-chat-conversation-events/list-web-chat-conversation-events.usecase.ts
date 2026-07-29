import { Injectable, NotFoundException } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import {
  AgentRepository,
  ConversationActivityRepository,
  ConversationParticipantTypeEnum,
  ConversationRepository,
} from '@novu/dal';
import { activityToEvents } from '../../activity-to-events';
import { ListWebChatConversationEventsCommand } from './list-web-chat-conversation-events.command';

@Injectable()
export class ListWebChatConversationEvents {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(
    command: ListWebChatConversationEventsCommand
  ): Promise<{ events: AgentEventEnvelope[]; hasMore: boolean }> {
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
        participant.type === ConversationParticipantTypeEnum.SUBSCRIBER &&
        participant.id === command.subscriberId
    );

    if (!isParticipant) {
      throw new NotFoundException('Conversation not found');
    }

    const agent = await this.agentRepository.findOne(
      { _id: conversation._agentId, _environmentId: command.environmentId },
      ['identifier']
    );

    if (!agent) {
      throw new NotFoundException('Conversation not found');
    }

    const activities = await this.activityRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _conversationId: conversation._id,
      },
      '*',
      { sort: { createdAt: 1 } }
    );

    const allEvents = activityToEvents(activities, {
      conversationId: conversation._id,
      agentIdentifier: agent.identifier,
    });

    const filtered = allEvents.filter((envelope) => envelope.sequence > command.afterSequence);
    const page = filtered.slice(0, command.limit);

    return {
      events: page,
      hasMore: filtered.length > command.limit,
    };
  }
}
