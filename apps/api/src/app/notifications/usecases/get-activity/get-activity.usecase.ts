import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';

@Injectable()
export class GetActivity {
  constructor(
    private notificationRepository: NotificationRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: GetActivityCommand): Promise<ActivityNotificationResponseDto> {
    this.analyticsService.track('Get Activity Feed Item - [Activity Feed]', command.userId, {
      _organization: command.organizationId,
    });

    return this.notificationRepository.getFeedItem(
      command.notificationId,
      command.environmentId,
      command.organizationId
    ) as Promise<ActivityNotificationResponseDto>;
  }
}
