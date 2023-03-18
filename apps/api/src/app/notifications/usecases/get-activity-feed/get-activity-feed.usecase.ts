import { Injectable } from '@nestjs/common';
import { SubscriberRepository, JobRepository } from '@novu/dal';
import { ActivitiesResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';

@Injectable()
export class GetActivityFeed {
  constructor(private subscribersRepository: SubscriberRepository, private jobRepository: JobRepository) {}

  async execute(command: GetActivityFeedCommand): Promise<ActivitiesResponseDto> {
    const LIMIT = 10;

    let subscriberIds: string[] = [];

    if (command.search || command.emails) {
      const foundSubscribers = await this.subscribersRepository.searchSubscribers(
        command.environmentId,
        command.search,
        command.emails
      );

      subscriberIds = foundSubscribers.map((subscriber) => subscriber._id);

      if (subscriberIds.length === 0) {
        return {
          page: 0,
          totalCount: 0,
          pageSize: LIMIT,
          data: [],
        };
      }
    }

    const { data: notifications, totalCount } = await this.jobRepository.getFeed(
      command.environmentId,
      {
        channels: command.channels,
        templates: command.templates,
        subscriberIds,
        transactionId: command.transactionId,
        startDate: command.startDate ? new Date(command.startDate) : undefined,
        endDate: command.endDate ? new Date(command.endDate) : undefined,
      },
      command.page * LIMIT,
      LIMIT
    );

    return {
      page: command.page,
      totalCount,
      pageSize: LIMIT,
      data: notifications,
    };
  }
}
