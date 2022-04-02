import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import * as moment from 'moment';
import { GetActivityGraphStatsCommand } from './get-acticity-graph-states.command';

@Injectable()
export class GetActivityGraphStats {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: GetActivityGraphStatsCommand): Promise<{ _id: string; count: number }[]> {
    return await this.messageRepository.getActivityGraphStats(
      moment().subtract(command.days, 'day').toDate(),
      command.applicationId
    );
  }
}
