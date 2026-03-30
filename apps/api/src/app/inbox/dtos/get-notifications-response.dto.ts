import type { NotificationFilter } from '../utils/types';
import { InboxNotificationDto } from './inbox-notification.dto';

export class GetNotificationsResponseDto {
  data: InboxNotificationDto[];
  hasMore: boolean;
  filter: NotificationFilter;
}
