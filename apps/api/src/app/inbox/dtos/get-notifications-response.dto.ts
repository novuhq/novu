import type { InboxNotification, NotificationFilter } from '../utils/types';

export class GetNotificationsResponseDto {
  data: InboxNotification[];
  hasMore: boolean;
  filter: NotificationFilter;
}
