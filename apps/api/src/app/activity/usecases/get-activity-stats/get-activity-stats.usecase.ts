import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@notifire/dal';
import * as moment from 'moment';
import { GetActivityStatsCommand } from './get-activity-stats.command';

@Injectable()
export class GetActivityStats {
  constructor(private messageRepository: MessageRepository) {}

  async execute(
    command: GetActivityStatsCommand
  ): Promise<{
    weeklySent: number;
    monthlySent: number;
  }> {
    const monthly = await this.messageRepository.count({
      _applicationId: command.applicationId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: String(moment().subtract(1, 'month').toDate()),
      },
    });

    const weekly = await this.messageRepository.count({
      _applicationId: command.applicationId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: String(moment().subtract(1, 'week').toDate()),
      },
    });

    return {
      weeklySent: weekly,
      monthlySent: monthly,
    };
  }
}
