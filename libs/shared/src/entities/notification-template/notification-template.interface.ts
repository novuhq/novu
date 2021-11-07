import { BuilderFieldOperator, BuilderFieldType, BuilderGroupValues } from '../../types/builder/builder.types';
import { IMessageTemplate } from '../message-template';

export interface INotificationTemplate {
  _id?: string;
  name: string;
  description?: string;
  _notificationGroupId: string;
  tags: string[];
  draft: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  messages: INotificationTemplateMessage[];
  triggers: INotificationTrigger[];
}

export enum TriggerTypeEnum {
  EVENT = 'event',
}

export interface INotificationTrigger {
  type: TriggerTypeEnum;
  identifier: string;
  variables: { name: string }[];
}

export interface INotificationTemplateMessage {
  _id?: string;
  filters?: IMessageFilter[];
  _templateId?: string;
  template: IMessageTemplate;
}

export interface IMessageFilter {
  isNegated?: boolean;
  type: BuilderFieldType;
  value: BuilderGroupValues;
  children: {
    field: string;
    value: string;
    operator: BuilderFieldOperator;
  }[];
}
