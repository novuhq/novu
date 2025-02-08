import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';
import { mapFeedItemToDto } from '../get-activity-feed/map-feed-item-to.dto';

@Injectable()
export class GetActivity {
  constructor(
    private notificationRepository: NotificationRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: GetActivityCommand): Promise<ActivityNotificationResponseDto> {
    this.analyticsService.track('Get Activity Feed Item - [Activity Feed]', command.userId, {
      _organization: command.organizationId,
    });

    const feedItem = await this.notificationRepository.getFeedItem(
      command.notificationId,
      command.environmentId,
      command.organizationId
    );

    return mapFeedItemToDto(feedItem);
  }
}
