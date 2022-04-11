import { NotificationStepDto } from './shared';

export interface IUpdateNotificationTemplate {
  name?: string;

  tags?: string[];

  description?: string;

  steps?: NotificationStepDto[];

  notificationGroupId?: string;
}
