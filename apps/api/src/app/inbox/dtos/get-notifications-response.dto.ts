import type { InboxNotification } from '../utils/types';

export class GetNotificationsResponseDto {
  data: InboxNotification[];
  hasMore: boolean;
  filter: {
    tags?: string[];
    read?: boolean;
    archived?: boolean;
  };
}
