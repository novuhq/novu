import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { subMonths, subWeeks, subYears } from 'date-fns';
import { ActivityStatsResponseDto } from '../../dtos/activity-stats-response.dto';
import { GetActivityStatsCommand } from './get-activity-stats.command';

@Injectable()
export class GetActivityStats {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute(command: GetActivityStatsCommand): Promise<ActivityStatsResponseDto> {
    const yearly = await this.notificationRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: subYears(new Date(), 1),
      },
    });

    const monthly = await this.notificationRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: subMonths(new Date(), 1),
      },
    });

    const weekly = await this.notificationRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: subWeeks(new Date(), 1),
      },
    });

    return {
      weeklySent: weekly,
      monthlySent: monthly,
      yearlySent: yearly,
    };
  }
}
