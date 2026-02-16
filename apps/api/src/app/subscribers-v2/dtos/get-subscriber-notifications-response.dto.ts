import { ApiProperty } from '@nestjs/swagger';
import type { InboxNotification, NotificationFilter } from '../../inbox/utils/types';

export class GetSubscriberNotificationsResponseDto {
  @ApiProperty({
    description: 'Array of notifications',
    type: 'array',
  })
  data: InboxNotification[];

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
