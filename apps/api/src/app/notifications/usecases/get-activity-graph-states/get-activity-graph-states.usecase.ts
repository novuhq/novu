import { Injectable } from '@nestjs/common';
import { SubscriberRepository, JobRepository } from '@novu/dal';
import { subDays } from 'date-fns';
import { ActivityGraphStatesResponse } from '../../dtos/activity-graph-states-response.dto';
import { GetActivityGraphStatsCommand } from './get-activity-graph-states.command';
import { GetActivityFeedCommand } from '../get-activity-feed/get-activity-feed.command';

const getDate = (dateStr) => {
  return new Date(dateStr);
};

@Injectable()
export class GetActivityGraphStats {
  constructor(private subscribersRepository: SubscriberRepository, private jobRepository: JobRepository) {}

  async execute(
    command: GetActivityFeedCommand | GetActivityGraphStatsCommand
  ): Promise<ActivityGraphStatesResponse[]> {
    //Code repetition because of usecase pattern
    let subscriberIds: string[] = [];

    if (command instanceof GetActivityFeedCommand && (command.search || command.emails)) {
      const foundSubscribers = await this.subscribersRepository.searchSubscribers(
        command.environmentId,
        command.search,
        command.emails
      );

      subscriberIds = foundSubscribers.map((subscriber) => subscriber._id);

      if (subscriberIds.length === 0) return [];
    }
    const query =
      command instanceof GetActivityGraphStatsCommand
        ? { startDate: subDays(new Date(), command.days), endDate: new Date() }
        : {
            channels: command.channels,
            templates: command.templates,
            subscriberIds,
            transactionId: command.transactionId,
            startDate: command.startDate ? new Date(command.startDate) : undefined,
            endDate: command.endDate ? new Date(command.endDate) : undefined,
            periodicity: command.periodicity,
          };
    const graphData = await this.jobRepository.getActivityGraphStats(command.environmentId, query);

    return graphData;
  }
}
