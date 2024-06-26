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
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  @CachedQuery({
    builder: ({ environmentId, subscriberId, ...command }: NotificationsCountCommand) =>
      buildMessageCountKey().cache({
        environmentId: environmentId,
        subscriberId: subscriberId,
        ...command,
      }),
  })
  async execute(command: NotificationsCountCommand): Promise<{ data: { count: number }; filter: NotificationFilter }> {
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

    const filter = { tags: command.tags, read: command.read, archived: command.archived };
    const count = await this.messageRepository.getCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      filter,
      { limit: MAX_NOTIFICATIONS_COUNT }
    );

    return { data: { count }, filter };
  }
}
