import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import * as moment from 'moment';
import { ActivityStatsResponseDto } from '../../dtos/activity-stats-response.dto';
import { GetActivityStatsCommand } from './get-activity-stats.command';

@Injectable()
export class GetActivityStats {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: GetActivityStatsCommand): Promise<ActivityStatsResponseDto> {
    const yearly = await this.messageRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: String(moment().subtract(1, 'year').toDate()),
      },
    });

    const monthly = await this.messageRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: String(moment().subtract(1, 'month').toDate()),
      },
    });

    const weekly = await this.messageRepository.count({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      createdAt: {
        $gte: String(moment().subtract(1, 'week').toDate()),
      },
    });

    return {
      weeklySent: weekly,
      monthlySent: monthly,
      yearlySent: yearly,
    };
  }
}
