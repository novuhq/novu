import {
  DeliveryLifecycleEventType,
  ISubscribersDefine,
  SeverityLevelEnum,
  StatelessControls,
  StepTypeEnum,
} from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import { NotificationTemplateEntity } from '../notification-template';
import type { OrganizationId } from '../organization';

export interface TopicPreferenceEvaluation {
  condition?: Record<string, unknown>;
  result: boolean;
  subscriptionIdentifier: string;
}

export type NotificationTopic = {
  _topicId: string;
  topicKey: string;
  preferenceEvaluation?: TopicPreferenceEvaluation;
};

export class NotificationEntity {
  _id: string;

  _templateId: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _subscriberId: string;

  topics: NotificationTopic[];

  transactionId: string;

  template?: NotificationTemplateEntity;

  channels?: StepTypeEnum[];

  _digestedNotificationId?: string;

  /*
   * This is a field that is used to define the subscriber that will receive the notification.
   * This field simplifies metric retrieval by associating external subscriber data, such as subscriberId.
   */
  to?: ISubscribersDefine | any;

  payload?: any;

  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  controls?: StatelessControls;
  severity?: SeverityLevelEnum;
  critical?: boolean;
  contextKeys?: string[];
  lastEmittedDeliveryEvent?: DeliveryLifecycleEventType;
}

export type NotificationDBModel = ChangePropsValueType<
  NotificationEntity,
  '_environmentId' | '_organizationId' | '_templateId' | '_subscriberId'
>;
