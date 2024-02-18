import { Injectable, BadRequestException } from '@nestjs/common';
import { ActorTypeEnum, ChannelTypeEnum } from '@novu/shared';
import {
  AnalyticsService,
  buildFeedKey,
  buildSubscriberKey,
  CachedEntity,
  CachedQuery,
} from '@novu/application-generic';
import { MessageRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';

import { GetNotificationsFeedCommand } from './get-notifications-feed.command';
import { MessagesResponseDto } from '../../dtos/message-response.dto';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class GetNotificationsFeed {
  constructor(
    private messageRepository: MessageRepository,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  private getPayloadObject(payload?: string): object | undefined {
    if (!payload) {
      return;
    }

    try {
      return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (e) {
      throw new BadRequestException('Invalid payload, the JSON object should be encoded to base64 string.');
    }
  }

  @CachedQuery({
    builder: ({ environmentId, subscriberId, ...command }: GetNotificationsFeedCommand) =>
      buildFeedKey().cache({
        environmentId: environmentId,
        subscriberId: subscriberId,
        ...command,
      }),
  })
  async execute(command: GetNotificationsFeedCommand): Promise<MessagesResponseDto> {
    const payload = this.getPayloadObject(command.payload);

    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) {
      throw new ApiException(
        'Subscriber not found for this environment with the id: ' +
          command.subscriberId +
          '. Make sure to create a subscriber before fetching the feed.'
      );
    }

    const feed = await this.messageRepository.findBySubscriberChannel(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      { feedId: command.feedId, seen: command.query.seen, read: command.query.read, payload },
      {
        limit: command.limit,
        skip: command.page * command.limit,
      }
    );

    if (feed.length) {
      this.analyticsService.mixpanelTrack('Fetch Feed - [Notification Center]', '', {
        _subscriber: feed[0]?._subscriberId,
        _organization: command.organizationId,
        feedSize: feed.length,
      });
    }

    for (const message of feed) {
      if (message._actorId && message.actor?.type === ActorTypeEnum.USER) {
        message.actor.data = this.processUserAvatar(message.actorSubscriber);
      }
    }

    const skip = command.page * command.limit;
    let totalCount = 0;

    if (feed.length) {
      totalCount = await this.messageRepository.getCount(
        command.environmentId,
        subscriber._id,
        ChannelTypeEnum.IN_APP,
        {
          feedId: command.feedId,
          seen: command.query.seen,
          read: command.query.read,
          payload,
        },
        { limit: command.limit + 1, skip }
      );
    }

    const hasMore = feed.length < totalCount;
    totalCount = Math.min(totalCount, command.limit);

    return {
      data: feed || [],
      totalCount: totalCount,
      hasMore: hasMore,
      pageSize: command.limit,
      page: command.page,
    };
  }

  private getHasMore(page: number, LIMIT: number, feed, totalCount) {
    const currentPaginationTotal = page * LIMIT + feed.length;

    return currentPaginationTotal < totalCount;
  }

  @CachedEntity({
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

  private processUserAvatar(actorSubscriber?: SubscriberEntity): string | null {
    return actorSubscriber?.avatar || null;
  }
}
