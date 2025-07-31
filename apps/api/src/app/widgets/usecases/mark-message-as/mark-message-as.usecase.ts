import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  buildSubscriberKey,
  CachedResponse,
  EventType,
  InvalidateCacheService,
  LogRepository,
  mapEventTypeToTitle,
  PinoLogger,
  Trace,
  TraceLogRepository,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageEntity, MessageRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { INVITE_TEAM_MEMBER_NUDGE_PAYLOAD_KEY, WebSocketEventEnum } from '@novu/shared';

import { MarkEnum, MarkMessageAsCommand } from './mark-message-as.command';

@Injectable()
export class MarkMessageAs {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private traceLogRepository: TraceLogRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: MarkMessageAsCommand): Promise<MessageEntity[]> {
    await this.invalidateCache.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    await this.messageRepository.changeStatus(command.environmentId, subscriber._id, command.messageIds, command.mark);

    const messages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _id: {
        $in: command.messageIds,
      },
    });

    const allTraceData: Omit<Trace, 'id' | 'expires_at'>[] = [];

    if (command.mark.seen != null) {
      await this.updateServices(command, subscriber, messages, MarkEnum.SEEN);

      const seenTraces = this.prepareTrace(
        messages,
        command.mark.seen ? 'message_seen' : 'message_unseen',
        command.subscriberId
      );
      allTraceData.push(...seenTraces);
    }

    if (command.mark.read != null) {
      await this.updateServices(command, subscriber, messages, MarkEnum.READ);

      const readTraces = this.prepareTrace(
        messages,
        command.mark.read ? 'message_read' : 'message_unread',
        command.subscriberId
      );
      allTraceData.push(...readTraces);
    }

    if (allTraceData.length > 0) {
      try {
        await this.traceLogRepository.createMany(allTraceData);
      } catch (error) {
        this.logger.warn({ err: error }, `Failed to create engagement traces for ${allTraceData.length} messages`);
      }
    }

    return messages;
  }

  private prepareTrace(
    messages: MessageEntity[],
    eventType: EventType,
    userId: string
  ): Omit<Trace, 'id' | 'expires_at'>[] {
    const traceDataArray: Omit<Trace, 'id' | 'expires_at'>[] = [];

    for (const message of messages) {
      if (message._jobId) {
        traceDataArray.push({
          created_at: LogRepository.formatDateTime64(new Date()),
          organization_id: message._organizationId,
          environment_id: message._environmentId,
          user_id: userId,
          subscriber_id: message._subscriberId,
          event_type: eventType,
          title: mapEventTypeToTitle(eventType),
          message: `Message ${eventType.replace('message_', '')} for subscriber ${message._subscriberId}`,
          raw_data: null,
          status: 'success',
          entity_type: 'step_run',
          entity_id: message._jobId,
          external_subscriber_id: message._subscriberId,
        });
      }
    }

    return traceDataArray;
  }

  private async updateServices(command: MarkMessageAsCommand, subscriber, messages, marked: MarkEnum) {
    this.updateSocketCount(subscriber, marked);

    for (const message of messages) {
      this.analyticsService.mixpanelTrack(`Mark as ${marked} - [Notification Center]`, '', {
        _subscriber: message._subscriberId,
        _organization: command.organizationId,
        _template: message._templateId,
      });
    }
  }

  private updateSocketCount(subscriber: SubscriberEntity, mark: MarkEnum) {
    const eventMessage = mark === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: eventMessage,
        userId: subscriber._id,
        _environmentId: subscriber._environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }

  private async sendAnalyticsEventForInviteTeamNudge(messages: MessageEntity[]) {
    const inviteTeamMemberNudgeMessage = messages.find(
      (message) => message?.payload[INVITE_TEAM_MEMBER_NUDGE_PAYLOAD_KEY] === true
    );

    if (inviteTeamMemberNudgeMessage) {
      this.analyticsService.track('Invite Nudge Seen', inviteTeamMemberNudgeMessage._subscriberId, {
        _organization: inviteTeamMemberNudgeMessage._organizationId,
      });
    }
  }

  @CachedResponse({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }
}
