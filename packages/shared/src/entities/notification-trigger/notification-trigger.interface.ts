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
