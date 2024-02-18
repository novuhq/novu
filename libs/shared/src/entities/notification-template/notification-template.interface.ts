import type { BuilderFieldType, BuilderGroupValues, TemplateVariableTypeEnum, FilterParts } from '../../types';
import { IMessageTemplate } from '../message-template';
import { IPreferenceChannels } from '../subscriber-preference';
import { IWorkflowStepMetadata } from '../step';

export interface INotificationTemplate {
  _id?: string;
  name: string;
  description?: string;
  _notificationGroupId: string;
  _parentId?: string;
  _environmentId: string;
  tags: string[];
  draft?: boolean;
  active: boolean;
  critical: boolean;
  preferenceSettings: IPreferenceChannels;
  createdAt?: string;
  updatedAt?: string;
  steps: INotificationTemplateStep[];
  triggers: INotificationTrigger[];
  isBlueprint?: boolean;
}

export class IGroupedBlueprint {
  name: string;
  blueprints: INotificationTemplate[];
}

export enum TriggerTypeEnum {
  EVENT = 'event',
}

export interface INotificationTrigger {
  type: TriggerTypeEnum;
  identifier: string;
  variables: INotificationTriggerVariable[];
  subscriberVariables?: INotificationTriggerVariable[];
  reservedVariables?: ITriggerReservedVariable[];
}

export enum TriggerContextTypeEnum {
  TENANT = 'tenant',
  ACTOR = 'actor',
}

export interface ITriggerReservedVariable {
  type: TriggerContextTypeEnum;
  variables: INotificationTriggerVariable[];
}

export interface INotificationTriggerVariable {
  name: string;
  value?: any;
  type?: TemplateVariableTypeEnum;
}

export interface IStepVariant {
  _id?: string;
  uuid?: string;
  name?: string;
  filters?: IMessageFilter[];
  _templateId?: string;
  _parentId?: string | null;
  template?: IMessageTemplate;
  active?: boolean;
  shouldStopOnFail?: boolean;
  replyCallback?: {
    active: boolean;
    url: string;
  };
  metadata?: IWorkflowStepMetadata;
}

export interface INotificationTemplateStep extends IStepVariant {
  variants?: IStepVariant[];
}

export interface IMessageFilter {
  isNegated?: boolean;
  type?: BuilderFieldType;
  value: BuilderGroupValues;
  children: FilterParts[];
}
