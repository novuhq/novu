import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AgentEventEnvelope } from '@novu/agent-event-protocol';
import {
  AgentRepository,
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationParticipantTypeEnum,
  ConversationRepository,
} from '@novu/dal';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { isMappableActivity, mapActivitiesToEventPage, WEB_CHAT_EVENT_ACTIVITY_FILTER } from '../../activity-to-events';
import { ListWebChatConversationEventsCommand } from './list-web-chat-conversation-events.command';

const ACTIVITY_FETCH_BATCH_SIZE = 100;

type EventPageResult = {
  events: AgentEventEnvelope[];
  hasMore: boolean;
  next: string | null;
  previous: string | null;
};

@Injectable()
export class ListWebChatConversationEvents {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(command: ListWebChatConversationEventsCommand): Promise<EventPageResult> {
    if (command.after && command.before) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    if ((command.after || command.before) && command.afterSequence > 0) {
      throw new BadRequestException('Use either cursor pagination (after/before) or afterSequence, not both.');
    }

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

    const mapContext = {
      conversationId: conversation._id,
      conversationIdentifier: conversation.identifier,
      agentIdentifier: agent.identifier,
    };

    if (command.afterSequence > 0) {
      return this.fetchAfterSequenceEventPage(command, conversation._id, mapContext);
    }

    const sequenceOffset = command.after
      ? await this.countMappableEventsUpToActivity(
          command.environmentId,
          command.organizationId,
          conversation._id,
          command.after
        )
      : 0;

    return this.fetchEventPage(command, conversation._id, mapContext, {
      activityCursor: command.after ?? command.before,
      before: command.before,
      sequenceOffset,
    });
  }

  private async fetchAfterSequenceEventPage(
    command: ListWebChatConversationEventsCommand,
    conversationId: string,
    mapContext: { conversationId: string; conversationIdentifier: string; agentIdentifier: string }
  ): Promise<EventPageResult> {
    const page = await this.activityRepository.listEventActivitiesAfterSequence({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId,
      afterSequence: command.afterSequence,
      limit: command.limit,
      filter: WEB_CHAT_EVENT_ACTIVITY_FILTER,
    });
    const events = mapActivitiesToEventPage(page.data, mapContext, {
      sequenceOffset: command.afterSequence,
      limit: command.limit,
    }).events;

    return {
      events,
      hasMore: page.hasMore,
      next: null,
      previous: null,
    };
  }

  private async fetchEventPage(
    command: ListWebChatConversationEventsCommand,
    conversationId: string,
    mapContext: { conversationId: string; conversationIdentifier: string; agentIdentifier: string },
    options: {
      activityCursor?: string;
      before?: string;
      sequenceOffset?: number;
    }
  ): Promise<EventPageResult> {
    const sortDirection = options.before ? -1 : 1;
    let activityCursor = options.activityCursor;
    let dbNext: string | null = null;
    let dbPrevious: string | null = null;
    const collected: ConversationActivityEntity[] = [];

    while (true) {
      const page = await this.activityRepository.listActivities({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        conversationId,
        after: options.before ? undefined : activityCursor,
        before: options.before ? activityCursor : undefined,
        limit: ACTIVITY_FETCH_BATCH_SIZE,
        sortDirection,
      });

      if (page.data.length === 0) {
        break;
      }

      collected.push(...page.data);
      dbNext = page.next;
      dbPrevious = page.previous;

      const mapped = mapActivitiesToEventPage(collected, mapContext, {
        sequenceOffset: options.sequenceOffset ?? 0,
        limit: command.limit,
      });

      if (mapped.events.length >= command.limit || mapped.hasMoreActivities || !page.next) {
        const events = options.before ? [...mapped.events].reverse() : mapped.events;

        return {
          events,
          hasMore: mapped.hasMoreActivities || Boolean(page.next),
          next: options.before ? dbPrevious : mapped.hasMoreActivities ? (mapped.lastActivityId ?? dbNext) : dbNext,
          previous: options.before
            ? mapped.hasMoreActivities
              ? (mapped.lastActivityId ?? dbNext)
              : dbNext
            : dbPrevious,
        };
      }

      activityCursor = page.next ?? undefined;
    }

    return { events: [], hasMore: false, next: null, previous: dbPrevious };
  }

  private async countMappableEventsUpToActivity(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    activityId: string
  ): Promise<number> {
    let offset = 0;
    let cursor: string | undefined;

    while (true) {
      const page = await this.activityRepository.listActivities({
        environmentId,
        organizationId,
        conversationId,
        after: cursor,
        limit: ACTIVITY_FETCH_BATCH_SIZE,
        sortDirection: 1,
      });

      if (page.data.length === 0) {
        return offset;
      }

      for (const activity of page.data) {
        if (activity._id === activityId) {
          return isMappableActivity(activity) ? offset + 1 : offset;
        }

        if (isMappableActivity(activity)) {
          offset += 1;
        }
      }

      if (!page.next) {
        return offset;
      }

      cursor = page.next;
    }
  }
}
