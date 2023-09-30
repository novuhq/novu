import { StepTypeEnum } from '@novu/shared';

import { NotificationTemplateEntity } from '../notification-template';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';
import type { ChangePropsValueType } from '../../types/helpers';

export class NotificationEntity {
  _id: string;

  _templateId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _subscriberId: string;

  transactionId: string;

  template?: NotificationTemplateEntity;

  channels?: StepTypeEnum[];

  _digestedNotificationId?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  to?: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;

  createdAt?: string;
  updatedAt?: string;
  expireAt?: string;
}

export type NotificationDBModel = ChangePropsValueType<
  NotificationEntity,
  '_environmentId' | '_organizationId' | '_templateId' | '_subscriberId'
>;
