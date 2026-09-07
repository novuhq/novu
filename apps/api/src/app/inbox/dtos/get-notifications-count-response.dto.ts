import type { NotificationFilter } from '../utils/types';

export class GetNotificationsCountResponseDto {
  data: Array<{
    count: number;
    filter: NotificationFilter;
  }>;
}
