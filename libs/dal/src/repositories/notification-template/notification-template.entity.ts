import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  ChannelCTATypeEnum,
  ChannelTypeEnum,
} from '@novu/shared';
import { MessageTemplateEntity } from '../message-template';
import { NotificationGroupEntity } from '../notification-group';

export class NotificationTemplateEntity {
  _id?: string;

  name: string;

  description: string;

  active: boolean;

  draft: boolean;

  tags: string[];

  messages: NotificationMessagesEntity[];

  _organizationId: string;

  _creatorId: string;

  _environmentId: string;

  triggers: NotificationTriggerEntity[];

  _notificationGroupId: string;

  readonly notificationGroup?: NotificationGroupEntity;
}

export class NotificationTriggerEntity {
  type: 'event';

  identifier: string;

  variables: {
    name: string;
  }[];
}

export class NotificationMessagesEntity {
  _id?: string;

  _templateId: string;

  template?: MessageTemplateEntity;

  filters?: MessageFilter[];
}

export class MessageFilter {
  isNegated: boolean;

  type: BuilderFieldType;

  value: BuilderGroupValues;

  children: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
  }[];
}
