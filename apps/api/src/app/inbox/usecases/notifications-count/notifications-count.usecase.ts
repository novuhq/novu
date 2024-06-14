import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, MessagesStatusEnum } from '@novu/shared';
import { buildMessageCountKey, CachedQuery } from '@novu/application-generic';

import { NotificationsCountCommand } from './notifications-count.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

const MAX_NOTIFICATIONS_COUNT = 100;

@Injectable()
export class NotificationsCount {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  private constuctQuery(command: NotificationsCountCommand) {
    const uniqueStatuses = new Set(command.status);
    const query = [...uniqueStatuses.values()].reduce<{ feedId?: string[]; seen?: boolean; read?: boolean }>(
      (acc, el) => {
        let seen: boolean | undefined;
        if ([MessagesStatusEnum.SEEN, MessagesStatusEnum.UNSEEN].includes(el)) {
          seen = typeof acc.seen === 'undefined' ? el === MessagesStatusEnum.SEEN : undefined;

          return {
            ...acc,
            seen,
          };
        }

        let read: boolean | undefined;
        if ([MessagesStatusEnum.READ, MessagesStatusEnum.UNREAD].includes(el)) {
          read = typeof acc.read === 'undefined' ? el === MessagesStatusEnum.READ : undefined;

          return {
            ...acc,
            read,
          };
        }

        return acc;
      },
      {
        feedId: command.feedId,
      }
    );

    return query;
  }

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
      this.constuctQuery(command),
      { limit: MAX_NOTIFICATIONS_COUNT }
    );

    return { count };
  }
}
