import { Inject, Injectable } from '@nestjs/common';
import { JobRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';

@Injectable()
export class GetActivity {
  constructor(
    private jobRepository: JobRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: GetActivityCommand): Promise<ActivityNotificationResponseDto> {
    this.analyticsService.track('Get Activity Feed Item - [Activity Feed]', command.userId, {
      _organization: command.organizationId,
    });

    return this.jobRepository.getFeedItem(
      command.notificationId,
      command.environmentId,
      command.organizationId
    ) as Promise<ActivityNotificationResponseDto>;
  }
}
