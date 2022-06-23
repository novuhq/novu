import { NotificationStepDto } from './notification-template.dto';

export interface ICreateNotificationTemplateDto {
  name: string;

  tags: string[];

  description: string;

  steps: NotificationStepDto[];

  notificationGroupId: string;

  active?: boolean;

  draft?: boolean;
}
