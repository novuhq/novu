import { NotificationMessageDto } from './shared';

export interface ICreateNotificationTemplateDto {
  name: string;

  tags: string[];

  description: string;

  messages: NotificationMessageDto[];

  notificationGroupId: string;

  active?: boolean;

  draft?: boolean;
}
