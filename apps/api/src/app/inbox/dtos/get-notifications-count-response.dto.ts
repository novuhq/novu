import type { NotificationFilter } from '../utils/types';

export class GetNotificationsCountResponseDto {
  data: {
    count: number;
  };
  filter: NotificationFilter;
}
