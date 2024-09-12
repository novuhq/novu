import { JSONSchema } from 'json-schema-to-ts';

import type {
  BuilderFieldType,
  BuilderGroupValues,
  TemplateVariableTypeEnum,
  FilterParts,
  WorkflowTypeEnum,
  NotificationTemplateCustomData,
} from '../../types';
import { IMessageTemplate } from '../message-template';
import { IPreferenceChannels } from '../subscriber-preference';
import { IWorkflowStepMetadata } from '../step';
import { INotificationGroup } from '../notification-group';
import { ControlsDto } from '../../dto';

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
  steps: INotificationTemplateStep[] | INotificationBridgeTrigger[];
  triggers: INotificationTrigger[];
  isBlueprint?: boolean;
  blueprintId?: string;
  type?: WorkflowTypeEnum;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payloadSchema?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: any;
  data?: NotificationTemplateCustomData;
}

export class IGroupedBlueprint {
  name: string;
  blueprints: IBlueprint[];
}

export interface IBlueprint extends INotificationTemplate {
  notificationGroup: INotificationGroup;
}

export enum TriggerTypeEnum {
  EVENT = 'event',
}

export interface INotificationBridgeTrigger {
  type: TriggerTypeEnum;
  identifier: string;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  type?: TemplateVariableTypeEnum;
}

export interface IStepVariant {
  _id?: string;
  uuid?: string;
  stepId?: string;
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
  inputs?: {
    schema: JSONSchema;
  };
  controls?: {
    schema: JSONSchema;
  };
  /*
   * controlVariables exists
   * only on none production environment in order to provide stateless control variables on fly
   */
  controlVariables?: ControlsDto;
  bridgeUrl?: string;
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
