import { NotificationTemplateEntity } from '../notification-template';

export class NotificationEntity {
  _id?: string;

  _templateId: string;

  _applicationId: string;

  _organizationId: string;

  _subscriberId: string;

  transactionId: string;

  template?: NotificationTemplateEntity;
}
