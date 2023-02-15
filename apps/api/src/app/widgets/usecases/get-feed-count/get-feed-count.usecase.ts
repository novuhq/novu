import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { GetFeedCountCommand } from './get-feed-count.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CachedQuery } from '../../../shared/interceptors/cached-query.interceptor';
import { KeyGenerator } from '../../../shared/services/cache/keys';

@Injectable()
export class GetFeedCount {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  @CachedQuery({ builder: KeyGenerator.query().messageCount().cache })
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
