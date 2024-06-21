import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { buildMessageCountKey, CachedQuery } from '@novu/application-generic';

import { NotificationsCountCommand } from './notifications-count.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { constructMessageStatusQuery } from '../../utils/messages';

const MAX_NOTIFICATIONS_COUNT = 100;

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
  async execute(command: NotificationsCountCommand): Promise<{ count: number }> {
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

    const count = await this.messageRepository.getCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      constructMessageStatusQuery(command.status),
      { limit: MAX_NOTIFICATIONS_COUNT }
    );

    return { count };
  }
}
