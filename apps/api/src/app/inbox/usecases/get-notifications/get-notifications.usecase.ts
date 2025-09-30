import { BadRequestException, Injectable } from '@nestjs/common';
import { AnalyticsService, buildFeedKey, CachedQuery } from '@novu/application-generic';
import { ChannelTypeEnum, MessageRepository } from '@novu/dal';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import type { GetNotificationsResponseDto } from '../../dtos/get-notifications-response.dto';
import { AnalyticsEventsEnum } from '../../utils';
import { mapToDto } from '../../utils/notification-mapper';
import { NotificationFilter } from '../../utils/types';
import { validateDataStructure } from '../../utils/validate-data';
import type { GetNotificationsCommand } from './get-notifications.command';

@Injectable()
export class GetNotifications {
  constructor(
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository
  ) {}

  @CachedQuery({
    builder: ({ environmentId, subscriberId, ...command }: GetNotificationsCommand) =>
      buildFeedKey().cache({
        environmentId,
        subscriberId,
        ...command,
      }),
  })
  async execute(command: GetNotificationsCommand): Promise<GetNotificationsResponseDto> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    if (command.read === false && command.archived === true) {
      throw new BadRequestException('Filtering for unread and archived notifications is not supported.');
    }

    let parsedData;
    if (command.data) {
      try {
        parsedData = JSON.parse(command.data);
        validateDataStructure(parsedData);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Invalid JSON format for data parameter');
      }
    }

    const severity = command.severity
      ? Array.isArray(command.severity)
        ? command.severity
        : [command.severity]
      : undefined;
    const { data: feed, hasMore } = await this.messageRepository.paginate(
      {
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
        channel: ChannelTypeEnum.IN_APP,
        tags: command.tags,
        read: command.read,
        archived: command.archived,
        snoozed: command.snoozed,
        seen: command.seen,
        data: parsedData,
        severity,
      },
      {
        limit: command.limit,
        offset: command.offset,
        after: command.after,
      }
    );

    if (feed.length) {
      this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.FETCH_NOTIFICATIONS, '', {
        _subscriber: subscriber.subscriberId,
        _organization: command.organizationId,
        feedSize: feed.length,
      });
    }

    const filters: NotificationFilter = {
      tags: command.tags,
      read: command.read,
      archived: command.archived,
      snoozed: command.snoozed,
      seen: command.seen,
      data: parsedData,
      severity: command.severity,
    };

    return {
      data: mapToDto(feed),
      hasMore,
      filter: filters,
    };
  }
}
