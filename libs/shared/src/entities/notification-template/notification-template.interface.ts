import { BuilderFieldOperator, BuilderFieldType, BuilderGroupValues } from '../../types';
import { IMessageTemplate, TemplateVariableTypeEnum } from '../message-template';
import { IPreferenceChannels } from '../subscriber-preference';

export interface INotificationTemplate {
  _id?: string;
  name: string;
  description?: string;
  _notificationGroupId: string;
  _parentId?: string;
  _environmentId: string;
  tags: string[];
  draft: boolean;
  active: boolean;
  critical: boolean;
  preferenceSettings: IPreferenceChannels;
  createdAt?: string;
  updatedAt?: string;
  steps: INotificationTemplateStep[];
  triggers: INotificationTrigger[];
}

export enum TriggerTypeEnum {
  EVENT = 'event',
}

export interface INotificationTrigger {
  type: TriggerTypeEnum;
  identifier: string;
  variables: INotificationTriggerVariable[];
  subscriberVariables?: INotificationTriggerVariable[];
}

export interface INotificationTriggerVariable {
  name: string;
  value?: any;
  type?: TemplateVariableTypeEnum;
}

export interface INotificationTemplateStep {
  _id?: string;
  filters?: IMessageFilter[];
  _templateId?: string;
  _parentId?: string;
  template?: IMessageTemplate;
  active?: boolean;
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
