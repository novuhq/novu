import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { GetFeedCountCommand } from './get-feed-count.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CachedQuery } from '../../../shared/interceptors/cached-query.interceptor';
import { GetNotificationsFeedCommand } from '../get-notifications-feed/get-notifications-feed.command';
import {
  CacheKeyPrefixEnum,
  CacheKeyTypeEnum,
  IdentifierPrefixEnum,
} from '../../../shared/services/cache/key-builders/shared';
import { buildQueryKey } from '../../../shared/services/cache/key-builders/queries';

@Injectable()
export class GetFeedCount {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  @CachedQuery({
    builder: (command: GetNotificationsFeedCommand) =>
      buildQueryKey({
        type: CacheKeyTypeEnum.QUERY,
        keyEntity: CacheKeyPrefixEnum.MESSAGE_COUNT,
        environmentId: command.environmentId,
        identifierPrefix: IdentifierPrefixEnum.SUBSCRIBER_ID,
        identifier: command.subscriberId,
        query: command as any,
      }),
  })
  async execute(command: GetFeedCountCommand): Promise<{ count: number }> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new ApiException(
        `Subscriber ${command.subscriberId} is not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }

    const count = await this.messageRepository.getCount(command.environmentId, subscriber._id, ChannelTypeEnum.IN_APP, {
      feedId: command.feedId,
      seen: command.seen,
      read: command.read,
    });

    return { count };
  }
}
