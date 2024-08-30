import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { buildMessageCountKey, CachedQuery } from '@novu/application-generic';

import type { NotificationsCountCommand } from './notifications-count.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import type { NotificationFilter } from '../../utils/types';

const MAX_NOTIFICATIONS_COUNT = 99;

@Injectable()
export class NotificationsCount {
  constructor(
    private messageRepository: MessageRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  @CachedQuery({
    builder: ({ environmentId, subscriberId, ...command }: NotificationsCountCommand) =>
      buildMessageCountKey().cache({
        environmentId,
        subscriberId,
        ...command,
      }),
  })
  async execute(
    command: NotificationsCountCommand
  ): Promise<{ data: Array<{ count: number; filter: NotificationFilter }> }> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId,
      true
    );

    if (!subscriber) {
      throw new ApiException(
        `Subscriber ${command.subscriberId} doesn't exist in environment ${command.environmentId}`
      );
    }

    const hasUnsupportedFilter = command.filters.some((filter) => filter.read === false && filter.archived === true);
    if (hasUnsupportedFilter) {
      throw new ApiException('Filtering for unread and archived notifications is not supported.');
    }

    const getCountPromises = command.filters.map((filter) =>
      this.messageRepository.getCount(command.environmentId, subscriber._id, ChannelTypeEnum.IN_APP, filter, {
        limit: MAX_NOTIFICATIONS_COUNT,
      })
    );

    const counts = await Promise.all(getCountPromises);
    const result = counts.map((count, index) => ({ count, filter: command.filters[index] }));

    return { data: result };
  }
}
