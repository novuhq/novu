import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '@novu/dal';
import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';

@Injectable()
export class GetActivity {
  constructor(private notificationRepository: NotificationRepository) {}

  async execute(command: GetActivityCommand): Promise<ActivityNotificationResponseDto> {
    return this.notificationRepository.getFeedItem(
      command.notificationId,
      command.environmentId,
      command.organizationId
    ) as Promise<ActivityNotificationResponseDto>;
  }
}
