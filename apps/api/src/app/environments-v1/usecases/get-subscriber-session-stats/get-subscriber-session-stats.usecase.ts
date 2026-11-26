import { Injectable } from '@nestjs/common';
import { SubscriberSessionAuthStatsService } from '../../../shared/services/subscriber-session-auth-stats.service';
import { SubscriberSessionStatsResponseDto } from '../../dtos/subscriber-session-stats.dto';
import { GetSubscriberSessionStatsCommand } from './get-subscriber-session-stats.command';
import { summarizeSubscriberSessionStats } from './summarize-subscriber-session-stats';

@Injectable()
export class GetSubscriberSessionStats {
  constructor(private subscriberSessionAuthStatsService: SubscriberSessionAuthStatsService) {}

  async execute(command: GetSubscriberSessionStatsCommand): Promise<SubscriberSessionStatsResponseDto> {
    const byDay = await this.subscriberSessionAuthStatsService.countByDay(command.environmentId, command.days);

    return summarizeSubscriberSessionStats(command.days, byDay);
  }
}
