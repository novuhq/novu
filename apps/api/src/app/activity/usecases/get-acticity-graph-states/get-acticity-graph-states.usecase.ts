import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { subDays } from 'date-fns';
import { ActivityGraphqStatesResponse } from '../../dtos/activity-graph-states-response.dto';
import { GetActivityGraphStatsCommand } from './get-acticity-graph-states.command';

@Injectable()
export class GetActivityGraphStats {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: GetActivityGraphStatsCommand): Promise<ActivityGraphqStatesResponse[]> {
    return await this.messageRepository.getActivityGraphStats(subDays(new Date(), command.days), command.environmentId);
  }
}
