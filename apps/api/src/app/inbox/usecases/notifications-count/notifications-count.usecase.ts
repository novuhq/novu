import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { MessageRepository, OrganizationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { buildMessageCountKey, CachedQuery } from '@novu/application-generic';
import { addHours } from 'date-fns';

import type { NotificationsCountCommand } from './notifications-count.command';
import type { NotificationFilter } from '../../utils/types';

const MAX_NOTIFICATIONS_COUNT = 99;

@Injectable()
export class NotificationsCount {
  constructor(
    private messageRepository: MessageRepository,
    private subscriberRepository: SubscriberRepository,
    private organizationRepository: OrganizationRepository
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
      throw new BadRequestException(
        `Subscriber ${command.subscriberId} doesn't exist in environment ${command.environmentId}`
      );
    }

    const hasUnsupportedFilter = command.filters.some((filter) => filter.read === false && filter.archived === true);
    if (hasUnsupportedFilter) {
      throw new BadRequestException('Filtering for unread and archived notifications is not supported.');
    }

    const retentionDate = await this.getRetentionPeriod(command.organizationId);
    const getCountPromises = command.filters.map((filter) =>
      this.messageRepository.getCount(
        command.environmentId,
        subscriber._id,
        ChannelTypeEnum.IN_APP,
        filter,
        { limit: MAX_NOTIFICATIONS_COUNT },
        { $gte: retentionDate }
      )
    );

    const counts = await Promise.all(getCountPromises);
    const result = counts.map((count, index) => ({ count, filter: command.filters[index] }));

    return { data: result };
  }

  private async getRetentionPeriod(organizationId: string): Promise<Date> {
    const organization = await this.organizationRepository.findOne({
      _id: organizationId,
    });

    if (!organization) {
      throw new InternalServerErrorException(`Organization ${organizationId} doesn't exist`);
    }

    const retentionPeriods = {
      legacy_free: 33 * 24 * 60 * 60 * 1000, // 30 + 3 days
      free: 27 * 60 * 60 * 1000, // 24 + 3 hours
      pro: 10 * 24 * 60 * 60 * 1000, // 7 + 3 days
      business: 93 * 24 * 60 * 60 * 1000, // 90 + 3 days
    };
    const fallbackRetentionPeriod = 93 * 24 * 60 * 60 * 1000; // 93 days

    const isLegacyFree =
      organization.apiServiceLevel === 'free' && Date.parse(organization.createdAt) < Date.parse('2025-02-28');

    let retentionDays: number;
    if (isLegacyFree) {
      retentionDays = retentionPeriods.legacy_free;
    } else if (!organization.apiServiceLevel || !(organization.apiServiceLevel in retentionPeriods)) {
      retentionDays = fallbackRetentionPeriod;
    } else {
      retentionDays = retentionPeriods[organization.apiServiceLevel];
    }

    const retentionHours = Math.floor(retentionDays / (60 * 60 * 1000));

    return addHours(new Date(), -retentionHours);
  }
}
