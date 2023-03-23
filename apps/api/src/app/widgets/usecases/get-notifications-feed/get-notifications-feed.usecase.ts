import { Inject, Injectable } from '@nestjs/common';
import { ChannelTypeEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';
import { MessageRepository, SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { GetNotificationsFeedCommand } from './get-notifications-feed.command';
import { MessagesResponseDto } from '../../dtos/message-response.dto';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CachedEntity } from '../../../shared/interceptors/cached-entity.interceptor';
import { CachedQuery } from '../../../shared/interceptors/cached-query.interceptor';
import {
  buildCommonKey,
  buildQueryKey,
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
} from '../../../shared/services/cache/keys';

@Injectable()
export class GetNotificationsFeed {
  constructor(
    private messageRepository: MessageRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  @CachedQuery({
    builder: (command: GetNotificationsFeedCommand) =>
      buildQueryKey({
        type: CacheKeyTypeEnum.QUERY,
        keyEntity: CacheKeyPrefixEnum.FEED,
        environmentId: command.environmentId,
        identifierPrefix: 's',
        identifier: command.subscriberId,
        query: command as any,
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

    const totalCount = await this.messageRepository.getTotalCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      {
        feedId: command.feedId,
        seen: command.query.seen,
      }
    );

    return {
      data: feed || [],
      totalCount: totalCount,
      pageSize: LIMIT,
      page: command.page,
    };
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildCommonKey({
        type: CacheKeyTypeEnum.ENTITY,
        keyEntity: CacheKeyPrefixEnum.SUBSCRIBER,
        environmentId: command._environmentId,
        identifier: command.subscriberId,
        identifierPrefix: 's',
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
