import { ApiProperty } from '@nestjs/swagger';
import { InboxNotificationDto } from '../../inbox/dtos/inbox-notification.dto';
import type { NotificationFilter } from '../../inbox/utils/types';

export class GetSubscriberNotificationsResponseDto {
  @ApiProperty({
    description: 'Array of notifications',
    type: [InboxNotificationDto],
  })
  data: InboxNotificationDto[];

  @ApiProperty({
    description: 'Indicates if there are more notifications available',
    type: Boolean,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'The filter applied to the notifications',
    type: 'object',
  })
  filter: NotificationFilter;
}
