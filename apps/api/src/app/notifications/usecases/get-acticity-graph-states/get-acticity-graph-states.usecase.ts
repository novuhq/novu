import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { subDays } from 'date-fns';
import { ActivityGraphqStatesResponse } from '../../dtos/activity-graph-states-response.dto';
import { GetActivityGraphStatsCommand } from './get-acticity-graph-states.command';

@Injectable()
export class GetActivityGraphStats {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute(command: GetActivityGraphStatsCommand): Promise<ActivityGraphqStatesResponse[]> {
    return await this.notificationRepository.getActivityGraphStats(
      subDays(new Date(), command.days),
      command.environmentId
    );
  }
}
