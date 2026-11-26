import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { max, subDays } from 'date-fns';
import { ActivityRetentionService } from '../../../shared/services/activity-retention.service';
import { ActivityGraphStatesResponse } from '../../dtos/activity-graph-states-response.dto';
import { GetActivityGraphStatsCommand } from './get-activity-graph-states.command';

@Injectable()
export class GetActivityGraphStats {
  constructor(
    private notificationRepository: NotificationRepository,
    private activityRetentionService: ActivityRetentionService
  ) {}

  async execute(command: GetActivityGraphStatsCommand): Promise<ActivityGraphStatesResponse[]> {
    const { after: retentionStart } = await this.activityRetentionService.resolve({
      organizationId: command.organizationId,
    });
    const requestedStart = subDays(new Date(), command.days);
    const start = retentionStart ? max([requestedStart, new Date(retentionStart)]) : requestedStart;

    return await this.notificationRepository.getActivityGraphStats(start, command.environmentId);
  }
}
