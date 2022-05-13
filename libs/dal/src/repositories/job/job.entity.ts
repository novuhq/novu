import { NotificationStepEntity } from '../notification-template';

export class JobEntity {
  _id?: string;
  identifier: string;
  payload: any;
  step: NotificationStepEntity;
  transactionId: string;
  _notificationId: string;
  _subscriberId: string;
  _environmentId: string;
  _organizationId: string;
  _userId: string;
  delay?: number;
  _parentId?: string;
}
