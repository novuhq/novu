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
}
