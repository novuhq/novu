import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@notifire/dal';
import * as moment from 'moment';
import { GetActivityGraphStatsCommand } from './get-acticity-graph-states.command';

@Injectable()
export class GetActivityGraphStats {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: GetActivityGraphStatsCommand): Promise<{ _id: string; count: number }[]> {
    return await this.messageRepository.aggregate([
      { $match: { createdAt: { $gte: moment().subtract(command.days, 'day').toDate() } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: {
            $sum: 1,
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}
