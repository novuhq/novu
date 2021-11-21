import { NotificationMessageDto } from './shared';

export interface IUpdateNotificationTemplate {
  name?: string;

  tags?: string[];

  description?: string;

  messages?: NotificationMessageDto[];

  notificationGroupId?: string;
}
