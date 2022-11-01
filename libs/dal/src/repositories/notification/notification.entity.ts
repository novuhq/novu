import { StepTypeEnum } from '@novu/shared';
import { NotificationTemplateEntity } from '../notification-template';

export class NotificationEntity {
  _id?: string;

  _templateId: string;

  _environmentId: string;

  _organizationId: string;

  _subscriberId: string;

  transactionId: string;

  template?: NotificationTemplateEntity;

  channels?: StepTypeEnum[];

  _digestedNotificationId?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  to?: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}
