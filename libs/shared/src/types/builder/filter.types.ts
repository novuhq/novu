import type { BuilderFieldOperator } from './builder.types';

export enum TimeOperatorEnum {
  DAYS = 'days',
  HOURS = 'hours',
  MINUTES = 'minutes',
}

export enum FilterPartTypeEnum {
  PAYLOAD = 'payload',
  SUBSCRIBER = 'subscriber',
  WEBHOOK = 'webhook',
  IS_ONLINE = 'isOnline',
  IS_ONLINE_IN_LAST = 'isOnlineInLast',
  PREVIOUS_STEP = 'previousStep',
  TENANT = 'tenant',
}

export enum PreviousStepTypeEnum {
  READ = 'read',
  UNREAD = 'unread',
  SEEN = 'seen',
  UNSEEN = 'unseen',
}

export interface IBaseFilterPart {
  on: FilterPartTypeEnum;
}

export interface IBaseFieldFilterPart extends IBaseFilterPart {
  field: string;
  value: string;
  operator: BuilderFieldOperator;
}

export interface IFieldFilterPart extends IBaseFieldFilterPart {
  on: FilterPartTypeEnum.SUBSCRIBER | FilterPartTypeEnum.PAYLOAD;
}

export interface IPreviousStepFilterPart extends IBaseFilterPart {
  on: FilterPartTypeEnum.PREVIOUS_STEP;
  step: string;
  stepType:
    | PreviousStepTypeEnum.READ
    | PreviousStepTypeEnum.SEEN
    | PreviousStepTypeEnum.UNREAD
    | PreviousStepTypeEnum.UNSEEN;
}

export interface IWebhookFilterPart extends IBaseFieldFilterPart {
  on: FilterPartTypeEnum.WEBHOOK;
  webhookUrl: string;
}

export interface ITenantFilterPart extends IBaseFieldFilterPart {
  on: FilterPartTypeEnum.TENANT;
}

export interface IRealtimeOnlineFilterPart extends IBaseFilterPart {
  on: FilterPartTypeEnum.IS_ONLINE;
  value: boolean;
}

export interface IOnlineInLastFilterPart extends IBaseFilterPart {
  on: FilterPartTypeEnum.IS_ONLINE_IN_LAST;
  timeOperator: TimeOperatorEnum;
  value: number;
}

export type FilterParts =
  | IFieldFilterPart
  | IWebhookFilterPart
  | IRealtimeOnlineFilterPart
  | IOnlineInLastFilterPart
  | IPreviousStepFilterPart
  | ITenantFilterPart;

export type Operator = BuilderFieldOperator | TimeOperatorEnum;

export interface ICondition {
  filter: string;
  field: string;
  expected: string;
  actual: string;
  operator: Operator;
  passed: boolean;
}
