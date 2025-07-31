import type { TemplateVariableTypeEnum, TriggerContextTypeEnum } from '../../types';

// TODO: Move to a const, it's not an enum if it has only one element
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
//
export interface ITriggerReservedVariable {
  type: TriggerContextTypeEnum;
  variables: INotificationTriggerVariable[];
}

export interface INotificationTriggerVariable {
  name: string;
  value?: any;
  type?: TemplateVariableTypeEnum;
}

export interface INotificationBridgeTrigger {
  type: TriggerTypeEnum;
  identifier: string;
}
