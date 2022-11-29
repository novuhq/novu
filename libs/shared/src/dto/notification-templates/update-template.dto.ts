import { NotificationStepDto } from './notification-template.dto';

export interface IUpdateNotificationTemplateDto {
  name?: string;

  tags?: string[];

  description?: string;

  identifier?: string;

  critical?: boolean;

  steps?: NotificationStepDto[];

  notificationGroupId?: string;
}
