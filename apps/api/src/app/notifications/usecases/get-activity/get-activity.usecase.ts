import { Inject, Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';

@Injectable()
export class GetActivity {
  constructor(private notificationRepository: NotificationRepository, private analyticsService: AnalyticsService) {}

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
