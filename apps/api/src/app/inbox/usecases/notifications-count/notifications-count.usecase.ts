import { BadRequestException, Injectable } from '@nestjs/common';
import { buildMessageCountKey, CachedQuery } from '@novu/application-generic';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, normalizeTagGroups } from '@novu/shared';
import type { NotificationFilter } from '../../utils/types';
import type { NotificationsCountCommand } from './notifications-count.command';

const MAX_NOTIFICATIONS_COUNT = 100;

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
        subscriber: {
          _id: command?.subscriber?._id,
          _organizationId: command?.subscriber?._organizationId,
          _environmentId: command?.subscriber?._environmentId,
          subscriberId: command?.subscriber?.subscriberId,
        },
      }),
  })
  async execute(
    command: NotificationsCountCommand
  ): Promise<{ data: Array<{ count: number; filter: NotificationFilter }> }> {
    const subscriber =
      command.subscriber ??
      (await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId, true, '_id'));

    if (!subscriber) {
      throw new BadRequestException(
        `Subscriber ${command.subscriberId} doesn't exist in environment ${command.environmentId}`
      );
    }

    const hasUnsupportedFilter = command.filters.some((filter) => filter.read === false && filter.archived === true);
    if (hasUnsupportedFilter) {
      throw new BadRequestException('Filtering for unread and archived notifications is not supported.');
    }

    const getCountPromises = command.filters.map((filter) => {
      const { tags: tagsFilter, ...filterRest } = filter;
      const severity = filter.severity
        ? Array.isArray(filter.severity)
          ? filter.severity
          : [filter.severity]
        : undefined;

      const tagGroups = tagsFilter !== undefined ? normalizeTagGroups(tagsFilter) : undefined;

      return this.messageRepository.getCount(
        command.environmentId,
        subscriber._id,
        ChannelTypeEnum.IN_APP,
        {
          ...filterRest,
          ...(tagGroups !== undefined ? { tagGroups } : {}),
          severity,
        },
        {
          limit: MAX_NOTIFICATIONS_COUNT,
        },
        command.contextKeys
      );
    });

    const counts = await Promise.all(getCountPromises);
    const result = counts.map((count, index) => ({ count, filter: command.filters[index] }));

    return { data: result };
  }
}
