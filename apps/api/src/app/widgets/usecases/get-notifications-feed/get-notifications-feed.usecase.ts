import { Injectable } from '@nestjs/common';
import { ChannelTypeEnum, IActor, ActorTypeEnum } from '@novu/shared';
import {
  AnalyticsService,
  buildFeedKey,
  buildSubscriberKey,
  CachedQuery,
  CachedEntity,
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

  @CachedQuery({
    builder: ({ environmentId, subscriberId, ...command }: GetNotificationsFeedCommand) =>
      buildFeedKey().cache({
        environmentId: environmentId,
        subscriberId: subscriberId,
        ...command,
      }),
  })
  async execute(command: GetNotificationsFeedCommand): Promise<MessagesResponseDto> {
    const LIMIT = 10;

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
      { feedId: command.feedId, seen: command.query.seen, read: command.query.read },
      {
        limit: LIMIT,
        skip: command.page * LIMIT,
      }
    );

    if (feed.length) {
      this.analyticsService.track('Fetch Feed - [Notification Center]', command.organizationId, {
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

    const totalCount = await this.messageRepository.getTotalCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      {
        feedId: command.feedId,
        seen: command.query.seen,
        read: command.query.read,
      }
    );

    return {
      data: feed || [],
      totalCount: totalCount || 0,
      pageSize: LIMIT,
      page: command.page,
    };
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
