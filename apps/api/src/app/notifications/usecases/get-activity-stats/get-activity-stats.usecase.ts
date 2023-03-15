import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { isBefore, parseISO, subMonths, subWeeks, subYears } from 'date-fns';

import { GetActivityStatsCommand } from './get-activity-stats.command';

import { ActivityStatsResponseDto } from '../../dtos/activity-stats-response.dto';

@Injectable()
export class GetActivityStats {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute(command: GetActivityStatsCommand): Promise<ActivityStatsResponseDto> {
    const now = new Date();

    const yearlyNotifications = await this.notificationRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        createdAt: {
          $gte: subYears(now, 1),
        },
      },
      {
        _id: 1,
        createdAt: 1,
      }
    );

    let weekly = 0;
    let monthly = 0;
    const oneMonthAgo = subMonths(now, 1);
    const oneWeekAgo = subWeeks(now, 1);

    for (const notification of yearlyNotifications) {
      const { createdAt } = notification;
      if (this.isAfterDateInPast(oneWeekAgo, createdAt)) {
        weekly += 1;
      }
      if (this.isAfterDateInPast(oneMonthAgo, createdAt)) {
        monthly += 1;
      }
    }

    return {
      weeklySent: weekly,
      monthlySent: monthly,
      yearlySent: yearlyNotifications.length,
    };
  }

  private isAfterDateInPast(dateInPast: Date, dateToCheck?: string): boolean {
    if (!dateToCheck) {
      return false;
    }

    const isoDate = parseISO(dateToCheck);

    return isBefore(dateInPast, isoDate);
  }
}
